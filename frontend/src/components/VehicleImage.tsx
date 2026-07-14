import { useState } from 'react';
import { cld, cldSrcSet, cldBlur, type CldOptions } from '@/lib/cloudinary';
import { cn } from '@/lib/cn';

type Props = {
  publicId: string | undefined | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** transform options for the primary source */
  options?: CldOptions;
  /** responsive widths for srcSet */
  widths?: number[];
  sizes?: string;
  priority?: boolean;
  /** contain (studio cutout) vs cover (photo fill) */
  fit?: 'contain' | 'cover';
  rounded?: boolean;
};

/**
 * Renders a Cloudinary-backed image entirely from a `publicId`.
 * - Derives an optimised, format-negotiated URL + responsive srcSet.
 * - Blur-up placeholder while loading, native lazy-loading.
 * - Falls back to a branded silhouette if the id is missing / not yet
 *   uploaded, so the layout is always intact.
 */
export function VehicleImage({
  publicId,
  alt,
  className,
  imgClassName,
  options,
  widths,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  fit = 'contain',
  rounded = false,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const crop = fit === 'cover' ? 'fill' : 'fit';
  const src = cld(publicId, { crop, gravity: 'auto', ...options });
  const srcSet = cldSrcSet(publicId, widths, { crop, gravity: 'auto', ...options });
  const blur = cldBlur(publicId);

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        rounded && 'rounded-2xl',
        className,
      )}
    >
      {/* Blur / skeleton layer */}
      {!loaded && !errored && (
        <div
          aria-hidden
          className="absolute inset-0 skeleton"
          style={
            publicId
              ? {
                  backgroundImage: `url(${blur})`,
                  backgroundSize: fit,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  filter: 'blur(8px)',
                }
              : undefined
          }
        />
      )}

      {errored || !publicId ? (
        <FallbackCar className={cn('h-full w-full', imgClassName)} />
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'h-full w-full transition-opacity duration-700',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}

/** On-brand placeholder used before real Cloudinary uploads exist. */
function FallbackCar({ className }: { className?: string }) {
  return (
    <div className={cn('grid place-items-center bg-mist-200', className)}>
      <svg
        viewBox="0 0 240 120"
        className="w-3/4 max-w-[220px] opacity-40"
        fill="none"
        aria-hidden
      >
        <path
          d="M28 78c8-24 30-38 58-38 24 0 40 8 52 24l40 4c14 2 22 8 22 18v6H28z"
          fill="#0b67c2"
          fillOpacity="0.14"
          stroke="#0b67c2"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="78" cy="90" r="14" fill="#061423" fillOpacity="0.15" stroke="#0b67c2" strokeWidth="3" />
        <circle cx="168" cy="90" r="14" fill="#061423" fillOpacity="0.15" stroke="#0b67c2" strokeWidth="3" />
        <path d="M96 44l30-2" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
