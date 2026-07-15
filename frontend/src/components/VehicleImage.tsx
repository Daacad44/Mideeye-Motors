import { useState } from 'react';
import { ik, ikSrcSet, type Preset } from '@/lib/imagekitImages';
import { cn } from '@/lib/cn';

type Props = {
  filePath: string | undefined | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Named ImageKit preset (maps to a `tr=` transformation string). */
  preset?: Preset;
  /** Additional presets to include in `srcset` for responsive loading. */
  srcSetPresets?: Preset[];
  sizes?: string;
  priority?: boolean;
  /** CSS object-fit — independent of the preset's own server-side crop. */
  fit?: 'contain' | 'cover';
  rounded?: boolean;
};

/**
 * Renders an ImageKit-backed image from a `filePath` + named preset.
 * - Native lazy-loading, skeleton shimmer while loading.
 * - Falls back to a branded silhouette if the path is missing / not yet
 *   uploaded, so the layout is always intact — never a broken image request.
 */
export function VehicleImage({
  filePath,
  alt,
  className,
  imgClassName,
  preset = 'card',
  srcSetPresets,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  fit = 'contain',
  rounded = false,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const src = ik(filePath, preset);
  const srcSet = srcSetPresets ? ikSrcSet(filePath, srcSetPresets) : undefined;

  return (
    <div className={cn('relative overflow-hidden', rounded && 'rounded-2xl', className)}>
      {!loaded && !errored && filePath && <div aria-hidden className="absolute inset-0 skeleton" />}

      {errored || !filePath || !src ? (
        <FallbackCar className={cn('h-full w-full', imgClassName)} />
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
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

/** On-brand placeholder used before real photos exist. */
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
