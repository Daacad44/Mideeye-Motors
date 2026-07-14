import { useState } from 'react';
import { cn } from '@/lib/cn';
import { cld } from '@/lib/cloudinary';
import { LOGO_PUBLIC_ID, BRAND_NAME, BRAND_SUB } from '@/lib/brand';

/**
 * Renders the OFFICIAL Mideeye Motors logo, loaded from Cloudinary.
 * No SVG recreation, no local asset. If the official PNG has not been
 * uploaded yet, it degrades to a plain text wordmark (never a fake badge).
 *
 * `variant="light"` is used on dark surfaces — the logo sits on a white chip
 * so the official colours keep their contrast without being altered.
 */
export function Logo({
  className,
  variant = 'dark',
  height = 40,
}: {
  className?: string;
  variant?: 'dark' | 'light';
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = cld(LOGO_PUBLIC_ID, { height: height * 2, crop: 'fit' });

  if (failed) {
    // Text-only fallback (not a logo recreation).
    return (
      <span className={cn('flex flex-col leading-none', className)}>
        <span
          className="font-display text-[17px] font-extrabold tracking-tight"
          style={{ color: variant === 'light' ? '#fff' : '#0b67c2' }}
        >
          {BRAND_NAME}
        </span>
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: variant === 'light' ? 'rgba(255,255,255,.72)' : '#7a8aa0' }}
        >
          {BRAND_SUB}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center',
        variant === 'light' && 'rounded-xl bg-white px-2.5 py-1.5 shadow-sm',
        className,
      )}
    >
      <img
        src={src}
        alt="Mideeye Motors & Rental Car Co."
        style={{ height }}
        className="w-auto object-contain"
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
