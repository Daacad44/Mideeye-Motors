/**
 * Server-authoritative rental pricing. The frontend shows the same catalog
 * for display only: a booking's price is always computed here from the
 * vehicle's daily rate and the ids the customer picked, never from prices the
 * client sends. Keep `frontend/src/pages/Booking.tsx` (EXTRAS / INSURANCE) in
 * sync when a price changes here.
 */

export const TAX_RATE = 0.05;

/** Default optional extras, USD per day (an admin can override them in Settings). */
export const EXTRAS: Record<string, number> = {
  driver: 40,
  childSeat: 8,
  wifi: 6,
  gps: 5,
};

/** Default insurance tiers, USD per day (an admin can override them in Settings). */
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
export function addOnsPerDay(extras: string[], insurance: string, catalog: PricingCatalog = DEFAULT_CATALOG) {
  const unique = [...new Set(extras)];
  const unknown = unique.filter((id) => !(id in catalog.extras));
  if (unknown.length) throw new PricingError(`Unknown extra: ${unknown.join(', ')}`);
  if (!(insurance in catalog.insurance)) throw new PricingError(`Unknown insurance option: ${insurance}`);
  return {
    extras: unique,
    extrasPerDay: round2(unique.reduce((sum, id) => sum + catalog.extras[id], 0)),
    insurancePerDay: catalog.insurance[insurance],
  };
}

export interface PricingCatalog {
  taxRate: number;
  extras: Record<string, number>;
  insurance: Record<string, number>;
}

export const DEFAULT_CATALOG: PricingCatalog = { taxRate: TAX_RATE, extras: EXTRAS, insurance: INSURANCE };

/**
 * Merge admin overrides onto the defaults. Only the known ids are priced, so a
 * stored JSON blob can never add an option the booking form doesn't offer;
 * bad values (negative, non-numeric) fall back to the default.
 */
export function buildCatalog(stored: { taxRate?: number | null; extrasPricing?: unknown; insurancePricing?: unknown } | null): PricingCatalog {
  const pick = (defaults: Record<string, number>, over: unknown) =>
    Object.fromEntries(
      Object.entries(defaults).map(([id, def]) => {
        const v = over && typeof over === 'object' ? (over as Record<string, unknown>)[id] : undefined;
        return [id, typeof v === 'number' && Number.isFinite(v) && v >= 0 ? round2(v) : def];
      }),
    );
  const tax = stored?.taxRate;
  return {
    taxRate: typeof tax === 'number' && tax >= 0 && tax <= 0.5 ? tax : TAX_RATE,
    extras: pick(EXTRAS, stored?.extrasPricing),
    insurance: pick(INSURANCE, stored?.insurancePricing),
  };
}

/** Round a USD amount to cents. Prices may have cents (e.g. a $0.10 test rate). */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Rental subtotal: (daily rate + add-ons) × days, in cents precision. */
export function rentalSubtotal(pricePerDay: number, addOnsPerDayTotal: number, days: number) {
  return round2((pricePerDay + addOnsPerDayTotal) * days);
}

/** Subtotal, tax and total for a rental, after an already-validated discount. */
export function totals(subtotal: number, discount: number, taxRate = TAX_RATE) {
  const discountedSubtotal = round2(Math.max(0, subtotal - discount));
  const tax = round2(discountedSubtotal * taxRate);
  return { tax, total: round2(discountedSubtotal + tax) };
}
