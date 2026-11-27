import type { Vehicle } from '@/types/vehicle';
import { vehicles as seed, getVehicleBySlug as seedBySlug } from '@/data/vehicles';
import { SPOTLIGHT_SLUG, withBundledPhotos } from '@/lib/bundledPhotos';

/**
 * Thin API client. Talks to the Express backend when reachable, and falls
 * back to the bundled seed fleet so the UI is always fully rendered in
 * development / preview environments without a running database.
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

async function request<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return fallback;
  }
}

/** Spotlight vehicle first, everything else in the API's order. */
const spotlightFirst = (list: Vehicle[]) =>
  [...list].sort((a, b) => Number(b.slug === SPOTLIGHT_SLUG) - Number(a.slug === SPOTLIGHT_SLUG));

const withPhotos = (list: Vehicle[]) => spotlightFirst(list.map(withBundledPhotos));

export const api = {
  listVehicles: (): Promise<Vehicle[]> => request('/vehicles', seed).then(withPhotos),
  featured: (): Promise<Vehicle[]> =>
    request('/vehicles?featured=true', seed.filter((v) => v.featured)).then(withPhotos),
  getVehicle: (slug: string): Promise<Vehicle | undefined> =>
    request(`/vehicles/${slug}`, seedBySlug(slug)).then((v) => (v ? withBundledPhotos(v) : v)),
};
