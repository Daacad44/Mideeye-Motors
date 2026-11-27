import { Router } from 'express';
import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { authenticate, optionalAuthenticate, requireStaff, ROLE_RANK, type AuthPayload } from '../middleware/auth.js';
import { env } from '../lib/env.js';
import { normalizeSomaliMsisdn } from '../lib/waafipay.js';
import { confirmBookingOnPayment, expireStaleCheckouts, settleWaafiPayment } from '../lib/checkout.js';

export const paymentsRouter = Router();

/**
 * A payment "driver" turns a create request into the payment's initial state.
 * This is the seam a real gateway plugs into: add a driver whose `init` calls
 * the gateway (it may be async / return a redirect ref) — the routes below
 * never change. `manual` records a customer-supplied mobile-money reference and
 * stays PENDING until an admin verifies; `mock` settles instantly for testing
 * and is refused unless `env.payments.allowMock` (off in production).
 */
interface PaymentDriver {
  init(input: { amount: number; reference?: string }): Promise<{
    status: PaymentStatus;
    reference: string | null;
    paidAt: Date | null;
  }>;
}

const drivers: Record<'manual' | 'mock', PaymentDriver> = {
  // Staff-only: staff record money they have already received (cash or
  // mobile money), so it settles immediately.
  manual: {
    async init({ reference }) {
      return { status: 'PAID', reference: reference ?? null, paidAt: new Date() };
    },
  },
  mock: {
    async init() {
      return { status: 'PAID', reference: `MOCK-${Date.now()}`, paidAt: new Date() };
    },
  },
};

type Provider = keyof typeof drivers | 'waafipay';

/**
 * Payment methods the customer checkout offers. Customers only ever pay
 * automatically (WaafiPay, once its merchant credentials are set); `mock`
 * settles instantly and exists only where explicitly allowed (never in
 * production). `manual` is not offered to customers: staff can still record
 * an offline payment against a booking.
 */
export function enabledProviders(
  allowMock = env.payments.allowMock,
  waafipay = env.payments.waafipay.configured,
): Provider[] {
  return [...(waafipay ? (['waafipay'] as const) : []), ...(allowMock ? (['mock'] as const) : [])];
}

/**
 * Who may pay for / see the payments of a booking:
 *  - staff and above, always;
 *  - the signed-in customer who owns the booking;
 *  - a guest who presents the booking's reference (shown only to the person
 *    who made the booking, on the confirmation screen and in their email).
 * The booking id alone is NOT enough.
 */
export function canAccessBooking(
  booking: { userId: string | null; reference: string },
  user: AuthPayload | undefined,
  bookingReference: string | undefined,
): boolean {
  if (user && ROLE_RANK[user.role] >= ROLE_RANK.STAFF) return true;
  if (user && booking.userId && booking.userId === user.id) return true;
  return !!bookingReference && bookingReference === booking.reference;
}

// GET /api/payments/providers — which payment methods the checkout may offer.
paymentsRouter.get('/providers', (_req, res) => {
  res.json({ data: enabledProviders() });
});

const createSchema = z.object({
  bookingId: z.string().min(1),
  bookingReference: z.string().min(1).optional(),
  provider: z.enum(['waafipay', 'manual', 'mock']),
  reference: z.string().trim().min(4).max(64).optional(),
  /** WaafiPay: the wallet number that receives the PIN prompt. */
  payerPhone: z.string().trim().min(6).max(24).optional(),
});

// POST /api/payments — start a payment for a booking. Amount comes from the
// booking total (server-authoritative), never from the client. The caller must
// own the booking (see canAccessBooking).
paymentsRouter.post('/', optionalAuthenticate, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { bookingId, bookingReference, provider, reference, payerPhone } = parsed.data;

  const isStaff = !!req.user && ROLE_RANK[req.user.role] >= ROLE_RANK.STAFF;
  // Staff may record an offline (manual) payment; customers pay automatically.
  const allowed = provider === 'manual' ? isStaff : enabledProviders().includes(provider);
  if (!allowed) {
    return res.status(400).json({ error: 'This payment method is not available.' });
  }
  const msisdn = provider === 'waafipay' ? normalizeSomaliMsisdn(payerPhone ?? '') : null;
  if (provider === 'waafipay' && !msisdn) {
    return res.status(400).json({ error: 'Enter a valid Somali mobile number (e.g. 61 234 5678).' });
  }

  // A WaafiPay push nobody answered (e.g. the server restarted mid-request)
  // must not block the customer from trying again.
  await expireStaleCheckouts();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { select: { status: true } }, vehicle: { select: { title: true } } },
  });
  // Same 404 for "missing" and "not yours" so ids can't be probed.
  if (!booking || !canAccessBooking(booking, req.user, bookingReference)) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    return res.status(409).json({ error: `This booking is ${booking.status.toLowerCase()} and can no longer be paid.` });
  }
  if (booking.payments.some((p) => p.status === 'PAID')) {
    return res.status(409).json({ error: 'This booking has already been paid.' });
  }
  if (booking.payments.some((p) => p.status === 'PENDING')) {
    return res.status(409).json({ error: 'A payment for this booking is already awaiting verification.' });
  }

  if (provider === 'waafipay') {
    const payment = await prisma.payment.create({
      data: { bookingId, provider, amount: booking.total, currency: 'USD', status: 'PENDING', payerPhone: msisdn },
    });
    res.status(201).json({ data: payment });
    void settleWaafiPayment(
      payment.id,
      { id: booking.id, reference: booking.reference, total: booking.total, vehicleTitle: booking.vehicle.title },
      msisdn!,
    ).catch((e) => console.error('[waafipay] settle failed', e));
    return;
  }

  const init = await drivers[provider as keyof typeof drivers].init({ amount: booking.total, reference });

  const payment = await prisma.payment.create({
    data: {
      bookingId,
      provider,
      amount: booking.total,
      currency: 'USD',
      status: init.status,
      reference: init.reference,
      paidAt: init.paidAt,
    },
  });

  // A settled payment confirms the booking.
  if (payment.status === 'PAID') await confirmBookingOnPayment(bookingId);

  res.status(201).json({ data: payment });
});

// GET /api/payments/booking/:bookingId — the payment(s) for a booking.
// Staff, the owning customer, or a guest passing ?reference=<booking reference>.
paymentsRouter.get('/booking/:bookingId', optionalAuthenticate, async (req, res) => {
  await expireStaleCheckouts();
  const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  const bookingReference = typeof req.query.reference === 'string' ? req.query.reference : undefined;
  if (!booking || !canAccessBooking(booking, req.user, bookingReference)) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const payments = await prisma.payment.findMany({
    where: { bookingId: req.params.bookingId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: payments });
});

// PATCH /api/payments/:id/verify — admin marks a manual payment PAID (or
// FAILED / REFUNDED). Verifying to PAID confirms the booking. Audited.
paymentsRouter.patch('/:id/verify', authenticate, requireStaff, async (req, res) => {
  const parsed = z
    .object({ status: z.enum(['PAID', 'FAILED', 'REFUNDED']).default('PAID') })
    .safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { status } = parsed.data;

  const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Payment not found' });

  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status,
      // Stamp paidAt when settling; keep an earlier stamp if already set.
      paidAt: status === 'PAID' ? existing.paidAt ?? new Date() : existing.paidAt,
    },
  });

  if (status === 'PAID') await confirmBookingOnPayment(payment.bookingId);

  await audit(req, 'PAYMENT_VERIFY', 'Payment', payment.id, {
    status,
    bookingId: payment.bookingId,
  });
  res.json({ data: payment });
});
