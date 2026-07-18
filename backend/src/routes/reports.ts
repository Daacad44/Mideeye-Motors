import { Router } from 'express';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { resolveRange, getRevenueTimeseries, type Granularity } from './analytics.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate, requireStaff);

/** Escape a value for CSV (RFC 4180 quoting). */
const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const day = (d: Date) => d.toISOString().slice(0, 10);

// GET /api/reports/bookings.csv?from=&to=&status=
reportsRouter.get('/bookings.csv', async (req, res) => {
  const range = resolveRange(req.query.from, req.query.to);
  if (!range) return res.status(400).json({ error: 'Invalid date range.' });
  const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
  if (status && !(status in BookingStatus)) return res.status(400).json({ error: 'Invalid status filter' });

  const bookings = await prisma.booking.findMany({
    where: { createdAt: { gte: range.from, lte: range.to }, ...(status ? { status: status as BookingStatus } : {}) },
    include: {
      vehicle: { select: { title: true } },
      user: { select: { name: true } },
      payments: { select: { amount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const header = ['reference', 'customer', 'vehicle', 'pickupDate', 'returnDate', 'days', 'total', 'paidAmount', 'status', 'createdAt'];
  const lines = [header.join(',')];
  for (const b of bookings) {
    const paid = b.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
    lines.push(
      [
        b.reference,
        b.customerName || b.user?.name || 'Guest',
        b.vehicle?.title ?? '',
        day(b.pickupDate),
        day(b.returnDate),
        b.days,
        b.total,
        paid,
        b.status,
        b.createdAt.toISOString(),
      ]
        .map(csvCell)
        .join(','),
    );
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bookings-${day(range.from)}_${day(range.to)}.csv"`);
  res.send(lines.join('\n'));
});

// GET /api/reports/revenue.csv?from=&to=&granularity=
reportsRouter.get('/revenue.csv', async (req, res) => {
  const range = resolveRange(req.query.from, req.query.to);
  if (!range) return res.status(400).json({ error: 'Invalid date range.' });
  const g: Granularity = req.query.granularity === 'week' ? 'week' : req.query.granularity === 'month' ? 'month' : 'day';

  const series = await getRevenueTimeseries(range.from, range.to, g);
  const lines = ['period,revenue,bookings', ...series.map((r) => [r.period, r.revenue, r.bookings].map(csvCell).join(','))];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="revenue-${day(range.from)}_${day(range.to)}.csv"`);
  res.send(lines.join('\n'));
});
