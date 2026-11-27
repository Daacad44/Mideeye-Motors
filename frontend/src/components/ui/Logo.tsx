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
 * Renders the OFFICIAL Daljir Rental Car logo (from ImageKit via the branding
 * API). Until a logo has been uploaded, the design-system wordmark is shown.
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
        variant === 'light' && 'rounded-lg bg-navy-950/75 px-2 py-1 shadow-sm ring-1 ring-white/10',
        className,
      )}
      style={{ minHeight: height }}
    >
      {showImage ? (
        <img
          src={hiDpiSrc(url, height)}
          alt="Daljir Rental Car"
          width={reservedWidth}
          height={height}
          style={{ height, maxHeight: height, width: 'auto' }}
          className="block w-auto max-w-full object-contain"
          loading="eager"
          decoding="async"
          onError={() => setErrored(true)}
        />
      ) : (
        // No logo uploaded yet: show the Daljir wordmark from the design system
        // (red "D" tile + spaced name) so the header is never blank.
        <span aria-label="Daljir Rental Car" role="img" className="inline-flex items-center gap-2.5" style={{ height }}>
          <span
            aria-hidden
            className="grid place-items-center rounded-[9px] bg-brand-600 font-display font-extrabold text-white"
            style={{ width: Math.round(height * 0.78), height: Math.round(height * 0.78), fontSize: Math.round(height * 0.44) }}
          >
            D
          </span>
          <span aria-hidden className="flex flex-col leading-none">
            <span className="font-display font-extrabold tracking-[0.2em] text-white" style={{ fontSize: Math.round(height * 0.42) }}>
              DALJIR
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-ink-400">Rental Car</span>
          </span>
        </span>
      )}
    </span>
  );
}
