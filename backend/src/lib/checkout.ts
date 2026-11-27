import { prisma } from './prisma.js';
import { cacheInvalidate } from './redis.js';
import { env } from './env.js';
import { notifyBookingConfirmed } from './notify.js';
import { waafiPurchase, WAAFI_TIMEOUT_MS } from './waafipay.js';

/**
 * Pay-to-book checkout.
 *
 * A customer's booking exists only as a short hold while the WaafiPay push is
 * on their phone. The outcome is binary:
 *  - payment APPROVED  → payment PAID, booking CONFIRMED;
 *  - anything else     → payment FAILED, booking CANCELLED (dates freed).
 * There is no "awaiting verification" state for customers.
 */

/** A push with no answer for this long is treated as failed (WaafiPay itself gives up after 5 minutes). */
export const WAAFI_STALE_MS = WAAFI_TIMEOUT_MS + 60_000;

/**
 * Move a booking to CONFIRMED once its payment settles and notify the
 * customer. A hold that was already released (timed out) is re-confirmed,
 * because the customer has paid.
 */
export async function confirmBookingOnPayment(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { vehicle: true } });
  if (!booking) return;
  if (booking.status !== 'PENDING' && booking.status !== 'CANCELLED') return; // already confirmed or further along
  if (booking.status === 'CANCELLED') {
    console.warn(`[checkout] booking ${booking.reference} was paid after its hold expired; re-confirming it`);
  }
  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } });
  await cacheInvalidate('vehicles:*');
  await notifyBookingConfirmed({
    reference: booking.reference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    vehicleTitle: booking.vehicle.title,
    total: booking.total,
    pickupDate: booking.pickupDate,
    returnDate: booking.returnDate,
  });
}

/**
 * Release an unpaid hold: the booking is cancelled (freeing the dates) and a
 * coupon it used is handed back. Only touches bookings still PENDING with no
 * settled payment.
 */
export async function releaseUnpaidBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { select: { status: true } } },
  });
  if (!booking || booking.status !== 'PENDING') return;
  if (booking.payments.some((p) => p.status === 'PAID' || p.status === 'PENDING')) return;
  const { count } = await prisma.booking.updateMany({ where: { id: bookingId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  if (count && booking.couponCode) {
    await prisma.coupon.updateMany({ where: { code: booking.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
  }
  await cacheInvalidate('vehicles:*');
}

/**
 * Fail WaafiPay pushes nobody answered (e.g. the server restarted mid-call)
 * and release their holds, so stale holds never block a car's dates.
 */
export async function expireStaleCheckouts(now = Date.now()) {
  const stale = await prisma.payment.findMany({
    where: { provider: 'waafipay', status: 'PENDING', createdAt: { lt: new Date(now - WAAFI_STALE_MS) } },
    select: { id: true, bookingId: true },
  });
  for (const p of stale) {
    const { count } = await prisma.payment.updateMany({
      where: { id: p.id, status: 'PENDING' },
      data: { status: 'FAILED', failureReason: 'timeout' },
    });
    if (count) await releaseUnpaidBooking(p.bookingId);
  }
  return stale.length;
}

/**
 * Run the WaafiPay push in the background and settle the payment with the
 * outcome. The customer's page polls GET /payments/booking/:id meanwhile.
 */
export async function settleWaafiPayment(
  paymentId: string,
  booking: { id: string; reference: string; total: number; vehicleTitle: string },
  msisdn: string,
) {
  const result = await waafiPurchase(env.payments.waafipay, {
    msisdn,
    amount: booking.total,
    referenceId: paymentId,
    invoiceId: booking.reference,
    description: `Daljir Rental Car ${booking.reference} - ${booking.vehicleTitle}`,
  });

  if (result.ok) {
    // A success always wins, even over a hold we already timed out locally:
    // the customer's money has moved.
    const { count } = await prisma.payment.updateMany({
      where: { id: paymentId, OR: [{ status: 'PENDING' }, { status: 'FAILED', failureReason: 'timeout' }] },
      data: { status: 'PAID', paidAt: new Date(), reference: result.transactionId || null, failureReason: null },
    });
    if (count) await confirmBookingOnPayment(booking.id);
    return;
  }

  const { count } = await prisma.payment.updateMany({
    where: { id: paymentId, status: 'PENDING' },
    data: { status: 'FAILED', failureReason: result.reason },
  });
  console.warn(`[waafipay] payment ${paymentId} (${booking.reference}) failed: ${result.reason} — ${result.message}`);
  if (count) await releaseUnpaidBooking(booking.id);
}

/** Sweep stale holds every minute (unref'd so it never keeps a process alive). */
export function startCheckoutSweeper(intervalMs = 60_000) {
  const timer = setInterval(() => {
    expireStaleCheckouts().catch((e) => console.error('[checkout] sweep failed', e));
  }, intervalMs);
  timer.unref();
  return timer;
}
