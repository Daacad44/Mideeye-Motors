import { useEffect, useState } from 'react';
import { cld } from './cloudinary';
import { LOGO_PUBLIC_ID } from './brand';

/**
 * Resolves the OFFICIAL logo URL.
 *
 * 1. Asks the API for the logo an admin uploaded to the brand folder
 *    (`/api/branding`) — this is the real, dynamic source of truth.
 * 2. Falls back to the configured Cloudinary publicId (VITE_LOGO_PUBLIC_ID).
 *
 * The result is cached module-wide so every <Logo/> shares one request.
 * We never render generated text/SVG in place of the logo.
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

let cache: Promise<string | null> | null = null;

export function loadLogoUrl(): Promise<string | null> {
  if (cache) return cache;
  cache = (async () => {
    try {
      const res = await fetch(`${API_URL}/branding`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        if (json.logoUrl) return json.logoUrl as string;
        if (json.logoPublicId) return cld(json.logoPublicId, { height: 120, crop: 'fit' });
      }
    } catch {
      /* fall through to the configured publicId */
    }
    return cld(LOGO_PUBLIC_ID, { height: 120, crop: 'fit' });
  })();
  return cache;
}

export function useLogoUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadLogoUrl().then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, []);
  return url;
}
