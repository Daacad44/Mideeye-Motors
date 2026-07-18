import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useLogoUrl } from '@/lib/branding';

// The official logo's approximate width:height ratio. Used ONLY to reserve
// space so layouts don't shift before the PNG loads; `object-contain` still
// guarantees the real image is never stretched or cropped if the true ratio
// differs slightly.
const LOGO_ASPECT = 1.5;

/**
 * Request a crisp, appropriately-sized delivery for high-DPI screens without
 * pulling a giant asset. Only touches ImageKit URLs; the branding API returns a
 * base delivery URL with no transform params, so appending one is safe. This
 * does NOT change the branding fetch / useLogoUrl logic — it's a render hint.
 */
function hiDpiSrc(url: string, height: number): string {
  if (!url.includes('ik.imagekit.io')) return url;
  const w = Math.min(768, Math.round(height * 6)); // ≥2× the rendered width, capped
  return url.includes('?') ? `${url}&tr=w-${w}` : `${url}?tr=w-${w}`;
}

/**
 * Renders the OFFICIAL Mideeye Motors logo PNG (from ImageKit via the branding
 * API). There is intentionally NO text/CSS/SVG recreation — if no logo has been
 * uploaded yet we reserve space with a transparent placeholder at the logo's
 * aspect ratio rather than substituting a fake wordmark.
 *
 * `variant`:
 *  - `dark`  (default) — no chip; for LIGHT surfaces (the logo's colours read).
 *  - `plain` — no chip; for DARK surfaces where the logo reads fine on its own.
 *  - `light` — a subtle white chip; for dark surfaces that need extra contrast.
 */
export function Logo({
  className,
  variant = 'dark',
  height = 44,
}: {
  className?: string;
  variant?: 'dark' | 'light' | 'plain';
  height?: number;
}) {
  const url = useLogoUrl();
  const [errored, setErrored] = useState(false);
  const showImage = url && !errored;
  const reservedWidth = Math.round(height * LOGO_ASPECT);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        variant === 'light' && 'rounded-lg bg-white/95 px-2 py-1 shadow-sm ring-1 ring-navy-950/5',
        className,
      )}
      style={{ minHeight: height }}
    >
      {showImage ? (
        <img
          src={hiDpiSrc(url, height)}
          alt="Mideeye Motors & Rental Car Co."
          width={reservedWidth}
          height={height}
          style={{ height, maxHeight: height, width: 'auto' }}
          className="block w-auto max-w-full object-contain"
          loading="eager"
          decoding="async"
          onError={() => setErrored(true)}
        />
      ) : (
        // Reserve space at the logo's ratio so layout never shifts on load.
        <span
          aria-label="Mideeye Motors & Rental Car Co."
          role="img"
          style={{ height, width: reservedWidth }}
          className="inline-block"
        />
      )}
    </span>
  );
}
