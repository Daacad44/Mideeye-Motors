/**
 * Server-authoritative rental pricing. The frontend shows the same catalog
 * for display only: a booking's price is always computed here from the
 * vehicle's daily rate and the ids the customer picked, never from prices the
 * client sends. Keep `frontend/src/pages/Booking.tsx` (EXTRAS / INSURANCE) in
 * sync when a price changes here.
 */

export const TAX_RATE = 0.05;

/** Optional extras, priced in whole USD per day. */
export const EXTRAS: Record<string, number> = {
  driver: 40,
  childSeat: 8,
  wifi: 6,
  gps: 5,
};

/** Insurance tiers, priced in whole USD per day. */
export const INSURANCE: Record<string, number> = {
  basic: 0,
  premium: 18,
  full: 30,
};

export const DAY_MS = 86_400_000;

/** Whole rental days between pickup and return (minimum 1). */
export function rentalDays(pickup: Date, ret: Date): number {
  return Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / DAY_MS) || 1);
}

export class PricingError extends Error {}

/**
 * Daily add-on cost for the chosen extras and insurance tier. Unknown ids are
 * rejected rather than silently priced at zero, and duplicate extras are
 * counted once.
 */
export function addOnsPerDay(extras: string[], insurance: string) {
  const unique = [...new Set(extras)];
  const unknown = unique.filter((id) => !(id in EXTRAS));
  if (unknown.length) throw new PricingError(`Unknown extra: ${unknown.join(', ')}`);
  if (!(insurance in INSURANCE)) throw new PricingError(`Unknown insurance option: ${insurance}`);
  return {
    extras: unique,
    extrasPerDay: unique.reduce((sum, id) => sum + EXTRAS[id], 0),
    insurancePerDay: INSURANCE[insurance],
  };
}

/** Subtotal, tax and total for a rental, after an already-validated discount. */
export function totals(subtotal: number, discount: number) {
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax = Math.round(discountedSubtotal * TAX_RATE);
  return { tax, total: discountedSubtotal + tax };
}
