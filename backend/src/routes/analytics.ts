import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { authenticate, requireStaff } from '../middleware/auth.js';

export const analyticsRouter = Router();

export type Granularity = 'day' | 'week' | 'month';

/** Resolve ?from/?to into a validated range (defaults to the last 30 days). */
export function resolveRange(fromRaw: unknown, toRaw: unknown): { from: Date; to: Date } | null {
  const now = new Date();
  const to = typeof toRaw === 'string' && toRaw ? new Date(toRaw) : now;
  const from = typeof fromRaw === 'string' && fromRaw ? new Date(fromRaw) : new Date(now.getTime() - 30 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return null;
  return { from, to };
}

function parseGranularity(raw: unknown): Granularity {
  return raw === 'week' || raw === 'month' ? raw : 'day';
}

/** Revenue (PAID payments) + booking counts bucketed by period — shared with reports. */
export async function getRevenueTimeseries(from: Date, to: Date, granularity: Granularity) {
  const [revenueRows, bookingRows] = await Promise.all([
    prisma.$queryRaw<Array<{ period: string; revenue: number }>>`
      SELECT to_char(date_trunc(${granularity}, "paidAt"), 'YYYY-MM-DD') AS period, COALESCE(SUM(amount), 0)::int AS revenue
      FROM "Payment"
      WHERE status = 'PAID' AND "paidAt" >= ${from} AND "paidAt" <= ${to}
      GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw<Array<{ period: string; bookings: number }>>`
      SELECT to_char(date_trunc(${granularity}, "createdAt"), 'YYYY-MM-DD') AS period, COUNT(*)::int AS bookings
      FROM "Booking"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY 1 ORDER BY 1
    `,
  ]);

  const map = new Map<string, { period: string; revenue: number; bookings: number }>();
  for (const r of revenueRows) map.set(r.period, { period: r.period, revenue: r.revenue, bookings: 0 });
  for (const b of bookingRows) {
    const e = map.get(b.period) ?? { period: b.period, revenue: 0, bookings: 0 };
    e.bookings = b.bookings;
    map.set(b.period, e);
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}

/** All summary KPIs for a range — computed entirely in the database. */
async function computeKpis(from: Date, to: Date) {
  const rangeDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));

  const [revenueAgg, bookingsCount, activeBookings, completedBookings, cancelledCount, avgAgg, vehicleCount, newCustomers, bookedRows] =
    await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID', paidAt: { gte: from, lte: to } } }),
      prisma.booking.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.booking.count({ where: { status: 'ACTIVE', createdAt: { gte: from, lte: to } } }),
      prisma.booking.count({ where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } } }),
      prisma.booking.count({ where: { status: 'CANCELLED', createdAt: { gte: from, lte: to } } }),
      prisma.booking.aggregate({ _avg: { total: true }, where: { status: { not: 'CANCELLED' }, createdAt: { gte: from, lte: to } } }),
      prisma.vehicle.count(),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: from, lte: to } } }),
      prisma.$queryRaw<Array<{ days: number }>>`
        SELECT COALESCE(SUM(
          GREATEST(0, LEAST("returnDate"::date, ${to}::date) - GREATEST("pickupDate"::date, ${from}::date))
        ), 0)::int AS days
        FROM "Booking"
        WHERE status <> 'CANCELLED' AND "pickupDate" <= ${to} AND "returnDate" >= ${from}
      `,
    ]);

  const totalRevenue = revenueAgg._sum.amount ?? 0;
  const bookedVehicleDays = bookedRows[0]?.days ?? 0;
  const capacity = vehicleCount * rangeDays;
  const occupancyRate = capacity > 0 ? Math.min(100, Math.round((bookedVehicleDays / capacity) * 1000) / 10) : 0;

  return {
    totalRevenue,
    bookingsCount,
    activeBookings,
    completedBookings,
    cancelledCount,
    avgBookingValue: avgAgg._avg.total ? Math.round(avgAgg._avg.total) : 0,
    occupancyRate,
    newCustomers,
  };
}

analyticsRouter.use(authenticate, requireStaff);

// GET /api/analytics/summary?from=&to= — KPIs + period-over-period % deltas.
analyticsRouter.get('/summary', async (req, res) => {
  const range = resolveRange(req.query.from, req.query.to);
  if (!range) return res.status(400).json({ error: 'Invalid date range.' });
  const { from, to } = range;

  const cacheKey = `analytics:summary:${from.getTime()}:${to.getTime()}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ data: cached });

  const len = to.getTime() - from.getTime();
  const [current, previous] = await Promise.all([
    computeKpis(from, to),
    computeKpis(new Date(from.getTime() - len), from),
  ]);

  // % change vs the previous equal-length period; null when there's no base.
  const delta = (c: number, p: number) => (p === 0 ? (c === 0 ? 0 : null) : Math.round(((c - p) / p) * 1000) / 10);
  const data = {
    ...current,
    deltas: {
      totalRevenue: delta(current.totalRevenue, previous.totalRevenue),
      bookingsCount: delta(current.bookingsCount, previous.bookingsCount),
      avgBookingValue: delta(current.avgBookingValue, previous.avgBookingValue),
      occupancyRate: delta(current.occupancyRate, previous.occupancyRate),
      newCustomers: delta(current.newCustomers, previous.newCustomers),
    },
  };

  await cacheSet(cacheKey, data, 30); // short TTL, matching the vehicles cache style
  res.json({ data });
});

// GET /api/analytics/revenue-timeseries?from=&to=&granularity=day|week|month
analyticsRouter.get('/revenue-timeseries', async (req, res) => {
  const range = resolveRange(req.query.from, req.query.to);
  if (!range) return res.status(400).json({ error: 'Invalid date range.' });
  const data = await getRevenueTimeseries(range.from, range.to, parseGranularity(req.query.granularity));
  res.json({ data });
});

// GET /api/analytics/top-vehicles?from=&to=&limit=
analyticsRouter.get('/top-vehicles', async (req, res) => {
  const range = resolveRange(req.query.from, req.query.to);
  if (!range) return res.status(400).json({ error: 'Invalid date range.' });
  const { from, to } = range;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));

  const [byRevenue, byBookings] = await Promise.all([
    prisma.$queryRaw<Array<{ vehicleId: string; title: string; revenue: number; bookings: number }>>`
      SELECT b."vehicleId" AS "vehicleId", v.title AS title, COALESCE(SUM(p.amount), 0)::int AS revenue, COUNT(DISTINCT b.id)::int AS bookings
      FROM "Payment" p
      JOIN "Booking" b ON b.id = p."bookingId"
      JOIN "Vehicle" v ON v.id = b."vehicleId"
      WHERE p.status = 'PAID' AND p."paidAt" >= ${from} AND p."paidAt" <= ${to}
      GROUP BY b."vehicleId", v.title
      ORDER BY revenue DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<Array<{ vehicleId: string; title: string; bookings: number }>>`
      SELECT b."vehicleId" AS "vehicleId", v.title AS title, COUNT(*)::int AS bookings
      FROM "Booking" b
      JOIN "Vehicle" v ON v.id = b."vehicleId"
      WHERE b.status <> 'CANCELLED' AND b."createdAt" >= ${from} AND b."createdAt" <= ${to}
      GROUP BY b."vehicleId", v.title
      ORDER BY bookings DESC
      LIMIT ${limit}
    `,
  ]);

  res.json({ data: { byRevenue, byBookings } });
});

// GET /api/analytics/status-breakdown?from=&to= — booking counts per status.
analyticsRouter.get('/status-breakdown', async (req, res) => {
  const range = resolveRange(req.query.from, req.query.to);
  if (!range) return res.status(400).json({ error: 'Invalid date range.' });

  const grouped = await prisma.booking.groupBy({
    by: ['status'],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const STATUSES = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
  res.json({ data: STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 })) });
});
