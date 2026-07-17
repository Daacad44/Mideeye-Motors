import { useEffect, useState } from 'react';

/**
 * Site-wide branding — a thin client over `GET /api/branding`.
 *
 * The API resolves the OFFICIAL logo (and favicon/hero) that an admin
 * uploaded via the Media Library into a ready-to-use delivery URL, so the
 * frontend never needs to know a filePath or ImageKit preset scheme for
 * these fields. We never render generated text/SVG in place of the logo —
 * if none has been uploaded yet, `logo` is simply `null`.
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export interface BrandingImage {
  url: string;
  alt: string;
}

export interface Branding {
  logo: BrandingImage | null;
  favicon: BrandingImage | null;
  heroImage: BrandingImage | null;
  primaryColor: string;
  phone: string;
  email: string;
  socials: Record<string, string>;
}

const EMPTY: Branding = {
  logo: null,
  favicon: null,
  heroImage: null,
  primaryColor: '#0b67c2',
  phone: '',
  email: '',
  socials: {},
};

let cache: Promise<Branding> | null = null;

// Simple subscription so live components (header/footer) re-render when an
// admin changes the logo, without a full page reload.
const listeners = new Set<(b: Branding) => void>();

function fetchBranding(): Promise<Branding> {
  return (async () => {
    try {
      const res = await fetch(`${API_URL}/branding`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) return (await res.json()) as Branding;
    } catch {
      /* network error — fall through to empty branding (placeholder logo) */
    }
    return EMPTY;
  })();
}

export function loadBranding(): Promise<Branding> {
  if (cache) return cache;
  cache = fetchBranding();
  return cache;
}

/**
 * Invalidate the cache, refetch, and push the fresh branding to every mounted
 * `useBranding()` consumer. Call after an admin sets/changes the logo so the
 * header and footer update immediately.
 */
export async function refreshBranding(): Promise<Branding> {
  cache = fetchBranding();
  const b = await cache;
  listeners.forEach((fn) => fn(b));
  return b;
}

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(EMPTY);
  useEffect(() => {
    let alive = true;
    loadBranding().then((b) => alive && setBranding(b));
    const fn = (b: Branding) => alive && setBranding(b);
    listeners.add(fn);
    return () => {
      alive = false;
      listeners.delete(fn);
    };
  }, []);
  return branding;
}

/** Convenience hook for components that only need the logo URL. */
export function useLogoUrl(): string | null {
  return useBranding().logo?.url ?? null;
}
