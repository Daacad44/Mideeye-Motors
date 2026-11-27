/** Branches a car can be collected from / returned to (stored as-is on the booking). */
export const LOCATIONS = [
  { id: 'Mogadishu HQ', key: 'locations.mogadishu' },
  { id: 'Hargeisa Branch', key: 'locations.hargeisa' },
  { id: 'Kismayo Branch', key: 'locations.kismayo' },
] as const;

/** i18n key for a stored location name (falls back to the raw name). */
export const locationKey = (id: string) => LOCATIONS.find((l) => l.id === id)?.key;

/** Query params that carry a search from Home → Fleet → Booking. */
export const TRIP_PARAMS = ['pickup', 'pickupDate', 'returnDate'] as const;

/** Keep only the trip params from a search string (for links between pages). */
export function tripQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of TRIP_PARAMS) {
    const v = params.get(k);
    if (v) out.set(k, v);
  }
  return out.toString();
}
