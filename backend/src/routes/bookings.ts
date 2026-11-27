import { Router } from 'express';
import { z } from 'zod';
import { BookingStatus, type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { cacheInvalidate } from '../lib/redis.js';
import { audit } from '../lib/audit.js';
import { authenticate, optionalAuthenticate, requireAdmin, requireStaff } from '../middleware/auth.js';
import { isRangeBlocked } from '../lib/availability.js';
import { serialize as serializeVehicle, vehicleInclude } from './vehicles.js';
import { computeCouponDiscount } from './coupons.js';
import { notifyBookingReceived, notifyBookingConfirmed, type BookingNotice } from '../lib/notify.js';
import { addOnsPerDay, PricingError, rentalDays, rentalSubtotal, totals, DAY_MS } from '../lib/pricing.js';
import { normalizeSomaliMsisdn } from '../lib/waafipay.js';
import { getPricingCatalog } from '../lib/settings.js';
import { confirmBookingOnPayment, expireStaleCheckouts, settleWaafiPayment } from '../lib/checkout.js';
import { enabledProviders } from './payments.js';

export const bookingsRouter = Router();

/**
 * A booking with its vehicle resolved to the API vehicle contract, plus a
 * derived payment summary (`paymentStatus` = PAID if any payment settled, else
 * PENDING if one is awaiting verification, else the latest state or null;
 * `amountPaid` = sum of settled payments).
 */
function serialize(b: any) {
  const { vehicle, user, payments, ...rest } = b;
  const list = payments ?? [];
  const paid = list.filter((p: any) => p.status === 'PAID');
  const paymentStatus = list.length
    ? paid.length
      ? 'PAID'
      : list.some((p: any) => p.status === 'PENDING')
        ? 'PENDING'
        : list[0].status
    : null;
  return {
    ...rest,
    vehicle: vehicle ? serializeVehicle(vehicle) : null,
    ...(user ? { user: { id: user.id, name: user.name, email: user.email } } : {}),
    paymentStatus,
    amountPaid: paid.reduce((s: number, p: any) => s + p.amount, 0),
    ...(payments ? { payments } : {}),
  };
}

/** Map a booking (with vehicle included) to the notification payload. */
function toNotice(b: any): BookingNotice {
  return {
    reference: b.reference,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    vehicleTitle: b.vehicle?.title ?? null,
    total: b.total,
    pickupDate: b.pickupDate,
    returnDate: b.returnDate,
  };
}

const bookingInclude = {
  vehicle: { include: vehicleInclude },
  payments: { orderBy: { createdAt: 'desc' as const } },
};

const schema = z.object({
  vehicleId: z.string(),
  pickupLocation: z.string(),
  dropoffLocation: z.string(),
  pickupDate: z.string(),
  returnDate: z.string(),
  extras: z.array(z.string()).max(10).default([]),
  insurance: z.string().default('basic'),
  // Accepted for backward compatibility with older clients but IGNORED: add-on
  // prices come from the server catalog in lib/pricing.ts.
  extrasPerDay: z.number().optional(),
  insurancePerDay: z.number().optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(30),
  couponCode: z.string().optional(),
});

type Prepared =
  | { ok: false; status: number; error: unknown }
  | { ok: true; vehicle: { id: string; title: string }; appliedCode: string | null; data: Prisma.BookingUncheckedCreateInput };

/**
 * Validate a booking request and price it server-side. Nothing is written.
 * Availability, the vehicle's daily rate, add-ons and coupons are all
 * resolved here; client-sent prices are never trusted.
 */
async function prepareBooking(body: unknown, userId: string | null): Promise<Prepared> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, error: parsed.error.flatten() };
  const b = parsed.data;

  const pickup = new Date(b.pickupDate);
  const ret = new Date(b.returnDate);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime()) || ret <= pickup) {
    return { ok: false, status: 400, error: 'Return date must be after the pickup date.' };
  }
  // Allow same-day pickups (and small clock/time-zone skew), but not the past.
  if (pickup.getTime() < Date.now() - DAY_MS) {
    return { ok: false, status: 400, error: 'Pickup date cannot be in the past.' };
  }

  const catalog = await getPricingCatalog();
  let addOns: ReturnType<typeof addOnsPerDay>;
  try {
    addOns = addOnsPerDay(b.extras, b.insurance, catalog);
  } catch (e) {
    if (e instanceof PricingError) return { ok: false, status: 400, error: e.message };
    throw e;
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { OR: [{ id: b.vehicleId }, { slug: b.vehicleId }] } });
  if (!vehicle) return { ok: false, status: 404, error: 'Vehicle not found' };
  if (!vehicle.availability) {
    return { ok: false, status: 409, error: 'This vehicle is not currently available for booking.' };
  }
  if (await isRangeBlocked(vehicle.id, pickup, ret)) {
    return { ok: false, status: 409, error: 'This vehicle isn’t available for the selected dates (already booked or under maintenance).' };
  }

  const days = rentalDays(pickup, ret);
  const subtotal = rentalSubtotal(vehicle.pricePerDay, addOns.extrasPerDay + addOns.insurancePerDay, days);

  // Re-validate the coupon server-side; the client-sent discount is never trusted.
  let discount = 0;
  let appliedCode: string | null = null;
  if (b.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: b.couponCode.trim().toUpperCase() } });
    const check = computeCouponDiscount(coupon, days, subtotal);
    if (!check.valid) return { ok: false, status: 400, error: 'This promo code is invalid or expired.' };
    discount = check.discount;
    appliedCode = coupon!.code;
  }

  const { tax, total } = totals(subtotal, discount, catalog.taxRate);

  return {
    ok: true,
    vehicle: { id: vehicle.id, title: vehicle.title },
    appliedCode,
    data: {
      vehicleId: vehicle.id,
      userId,
      customerName: b.name,
      customerEmail: b.email,
      customerPhone: b.phone,
      pickupLocation: b.pickupLocation,
      dropoffLocation: b.dropoffLocation,
      pickupDate: pickup,
      returnDate: ret,
      extras: addOns.extras,
      insurance: b.insurance,
      days,
      subtotal,
      discount,
      couponCode: appliedCode,
      tax,
      total,
      status: 'PENDING',
    },
  };
}

// POST /api/bookings — staff create a booking by hand (e.g. a phone booking).
// It starts PENDING until staff record a payment. Customers book through
// POST /api/bookings/checkout, which only keeps a booking that is paid.
bookingsRouter.post('/', authenticate, requireStaff, async (req, res) => {
  const extra = z
    .object({
      /** Staff already took the money (cash / mobile money): record it and confirm. */
      paid: z.boolean().default(false),
      paymentReference: z.string().trim().max(64).optional(),
    })
    .safeParse(req.body ?? {});
  if (!extra.success) return res.status(400).json({ error: extra.error.flatten() });
  const prep = await prepareBooking(req.body, null);
  if (!prep.ok) return res.status(prep.status).json({ error: prep.error });
  const { paid, paymentReference } = extra.data;

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({ data: { ...prep.data, status: paid ? 'CONFIRMED' : 'PENDING' } });
    if (paid) {
      await tx.payment.create({
        data: { bookingId: created.id, provider: 'manual', amount: created.total, status: 'PAID', paidAt: new Date(), reference: paymentReference || null },
      });
    }
    if (prep.appliedCode) {
      await tx.coupon.update({ where: { code: prep.appliedCode }, data: { usedCount: { increment: 1 } } });
    }
    return tx.booking.findUniqueOrThrow({ where: { id: created.id }, include: bookingInclude });
  });

  await cacheInvalidate('vehicles:*');
  await audit(req, 'BOOKING_CREATE', 'Booking', booking.id, { reference: booking.reference });
  await notifyBookingReceived(toNotice(booking));
  res.status(201).json({ data: serialize(booking) });
});

const checkoutSchema = z.object({
  /** The wallet number that receives the WaafiPay PIN prompt. */
  payerPhone: z.string().trim().min(6).max(24),
  /** `mock` only where PAYMENTS_ALLOW_MOCK is on (never in production). */
  method: z.enum(['waafipay', 'mock']).default('waafipay'),
});

// POST /api/bookings/checkout — pay-to-book. Prices the booking, holds the
// dates, and sends the WaafiPay PIN prompt to the customer's wallet. The
// booking is CONFIRMED only when the payment is APPROVED; if the customer
// rejects, lacks funds or doesn't answer, it is CANCELLED automatically.
// Poll GET /api/payments/booking/:id?reference=… for the outcome.
bookingsRouter.post('/checkout', optionalAuthenticate, async (req, res) => {
  const pay = checkoutSchema.safeParse(req.body);
  if (!pay.success) return res.status(400).json({ error: pay.error.flatten() });
  const { method } = pay.data;
  if (!enabledProviders().includes(method)) {
    return res.status(503).json({ error: 'Online payment is not available right now. Please contact us to book.' });
  }
  const msisdn = normalizeSomaliMsisdn(pay.data.payerPhone);
  if (!msisdn) return res.status(400).json({ error: 'Enter a valid Somali mobile number (e.g. 61 234 5678).' });

  await expireStaleCheckouts();
  const prep = await prepareBooking(req.body, req.user?.id ?? null);
  if (!prep.ok) return res.status(prep.status).json({ error: prep.error });
  if (prep.data.total <= 0) return res.status(400).json({ error: 'This booking has nothing to pay.' });

  const { booking, payment } = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({ data: prep.data });
    if (prep.appliedCode) {
      await tx.coupon.update({ where: { code: prep.appliedCode }, data: { usedCount: { increment: 1 } } });
    }
    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: method,
        amount: booking.total,
        currency: 'USD',
        status: method === 'mock' ? 'PAID' : 'PENDING',
        payerPhone: msisdn,
        ...(method === 'mock' ? { reference: `MOCK-${Date.now()}`, paidAt: new Date() } : {}),
      },
    });
    return { booking, payment };
  });
  await cacheInvalidate('vehicles:*');

  res.status(201).json({
    data: { booking: { id: booking.id, reference: booking.reference, total: booking.total }, payment },
  });

  if (method === 'mock') {
    await confirmBookingOnPayment(booking.id).catch((e) => console.error('[checkout] confirm failed', e));
    return;
  }
  void settleWaafiPayment(
    payment.id,
    { id: booking.id, reference: booking.reference, total: booking.total, vehicleTitle: prep.vehicle.title },
    msisdn,
  ).catch((e) => console.error('[waafipay] settle failed', e));
});

// GET /api/bookings — list ALL bookings (staff+), optional ?status / ?vehicleId.
bookingsRouter.get('/', authenticate, requireStaff, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const vehicleId = typeof req.query.vehicleId === 'string' ? req.query.vehicleId : undefined;
  if (status && !(status in BookingStatus)) {
    return res.status(400).json({ error: 'Invalid status filter' });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status ? { status: status as BookingStatus } : {}),
      ...(vehicleId ? { vehicleId } : {}),
    },
    include: { ...bookingInclude, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: bookings.map(serialize) });
});

// GET /api/bookings/me — the current user's bookings, newest first.
bookingsRouter.get('/me', authenticate, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: bookings.map(serialize) });
});

// GET /api/bookings/reference/:reference — public lookup for "track my booking".
bookingsRouter.get('/reference/:reference', async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { reference: req.params.reference },
    include: bookingInclude,
  });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ data: serialize(booking) });
});

const editSchema = z.object({
  vehicleId: z.string().optional(),
  pickupLocation: z.string().trim().min(1).optional(),
  dropoffLocation: z.string().trim().min(1).optional(),
  pickupDate: z.string().optional(),
  returnDate: z.string().optional(),
  extras: z.array(z.string()).max(10).optional(),
  insurance: z.string().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
});

// PATCH /api/bookings/:id — edit a booking (staff+). Changing the car, dates,
// extras or insurance re-checks availability (ignoring this booking) and
// re-prices it from the current rates; the coupon discount already granted is
// kept. Audited.
bookingsRouter.patch('/:id', authenticate, requireStaff, async (req, res) => {
  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const e = parsed.data;

  const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Booking not found' });

  const pickup = e.pickupDate ? new Date(e.pickupDate) : existing.pickupDate;
  const ret = e.returnDate ? new Date(e.returnDate) : existing.returnDate;
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime()) || ret <= pickup) {
    return res.status(400).json({ error: 'Return date must be after the pickup date.' });
  }

  let vehicleId = existing.vehicleId;
  if (e.vehicleId && e.vehicleId !== existing.vehicleId) {
    const v = await prisma.vehicle.findFirst({ where: { OR: [{ id: e.vehicleId }, { slug: e.vehicleId }] }, select: { id: true } });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    vehicleId = v.id;
  }

  const repricing = vehicleId !== existing.vehicleId || !!e.pickupDate || !!e.returnDate || !!e.extras || !!e.insurance;
  const data: Prisma.BookingUncheckedUpdateInput = {
    ...(e.name !== undefined ? { customerName: e.name } : {}),
    ...(e.email !== undefined ? { customerEmail: e.email } : {}),
    ...(e.phone !== undefined ? { customerPhone: e.phone } : {}),
    ...(e.pickupLocation !== undefined ? { pickupLocation: e.pickupLocation } : {}),
    ...(e.dropoffLocation !== undefined ? { dropoffLocation: e.dropoffLocation } : {}),
    ...(e.status !== undefined ? { status: e.status } : {}),
  };

  if (repricing) {
    const finalStatus = e.status ?? existing.status;
    if (finalStatus !== 'CANCELLED') {
      const clash = await prisma.booking.findFirst({
        where: { id: { not: existing.id }, vehicleId, status: { not: 'CANCELLED' }, pickupDate: { lte: ret }, returnDate: { gte: pickup } },
        select: { id: true },
      });
      const maintenance = await prisma.vehicleMaintenance.findFirst({
        where: { vehicleId, fromDate: { lte: ret }, toDate: { gte: pickup } },
        select: { id: true },
      });
      if (clash || maintenance) {
        return res.status(409).json({ error: 'The car is already booked or under maintenance for those dates.' });
      }
    }
    const catalog = await getPricingCatalog();
    let addOns: ReturnType<typeof addOnsPerDay>;
    try {
      addOns = addOnsPerDay(e.extras ?? existing.extras, e.insurance ?? existing.insurance, catalog);
    } catch (err) {
      if (err instanceof PricingError) return res.status(400).json({ error: err.message });
      throw err;
    }
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    const days = rentalDays(pickup, ret);
    const subtotal = rentalSubtotal(vehicle.pricePerDay, addOns.extrasPerDay + addOns.insurancePerDay, days);
    const discount = Math.min(existing.discount, subtotal);
    const { tax, total } = totals(subtotal, discount, catalog.taxRate);
    Object.assign(data, {
      vehicleId, pickupDate: pickup, returnDate: ret, extras: addOns.extras, insurance: e.insurance ?? existing.insurance,
      days, subtotal, discount, tax, total,
    });
  }

  const booking = await prisma.booking.update({ where: { id: existing.id }, data, include: bookingInclude });
  await audit(req, 'BOOKING_UPDATE', 'Booking', booking.id, { changes: Object.keys(e), total: booking.total });
  await cacheInvalidate('vehicles:*');
  if (existing.status !== 'CONFIRMED' && booking.status === 'CONFIRMED') {
    await notifyBookingConfirmed(toNotice(booking));
  }
  res.json({ data: serialize(booking) });
});

// DELETE /api/bookings/:id — remove a booking and its payments (admin+). Audited.
// Prefer cancelling: deleting erases its payment history.
bookingsRouter.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const existing = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { review: { select: { id: true } } } });
  if (!existing) return res.status(404).json({ error: 'Booking not found' });
  await prisma.$transaction(async (tx) => {
    if (existing.review) await tx.review.delete({ where: { id: existing.review.id } });
    await tx.booking.delete({ where: { id: existing.id } });
  });
  await audit(req, 'BOOKING_DELETE', 'Booking', existing.id, { reference: existing.reference, total: existing.total });
  await cacheInvalidate('vehicles:*');
  res.status(204).end();
});

// PATCH /api/bookings/:id/status — change status (staff+); writes an audit log.
bookingsRouter.patch('/:id/status', authenticate, requireStaff, async (req, res) => {
  const parsed = z.object({ status: z.nativeEnum(BookingStatus) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Booking not found' });

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    include: bookingInclude,
  });

  await audit(req, 'BOOKING_STATUS', 'Booking', booking.id, {
    from: existing.status,
    to: booking.status,
  });
  // Cancelling / completing frees the slot; any status change may affect availability.
  await cacheInvalidate('vehicles:*');
  // Notify only on the actual transition into CONFIRMED.
  if (existing.status !== 'CONFIRMED' && booking.status === 'CONFIRMED') {
    await notifyBookingConfirmed(toNotice(booking));
  }
  res.json({ data: serialize(booking) });
});
