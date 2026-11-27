import { useState } from 'react';
import { ik, ikSrcSet, type Preset } from '@/lib/imagekitImages';
import { cn } from '@/lib/cn';
import { useI18n } from '@/context/LocaleContext';

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

/** Shown when a vehicle has no photo yet — never another car's photo. */
function FallbackCar({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn('red-glow @container flex flex-col items-center justify-center gap-2 bg-inset', className)}>
      <svg viewBox="0 0 240 110" className="w-3/5 max-w-[200px]" fill="none" aria-hidden>
        <path
          d="M24 74c8-22 30-36 58-36 24 0 40 8 52 22l42 4c14 2 24 8 24 18v8H24z"
          fill="#ffffff"
          fillOpacity="0.04"
          stroke="#ffffff"
          strokeOpacity="0.22"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="76" cy="88" r="13" fill="#07090c" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2.5" />
        <circle cx="168" cy="88" r="13" fill="#07090c" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2.5" />
        <path d="M30 98h184" stroke="#e5142b" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400 @[160px]:block">{t('common.photoSoon')}</span>
    </div>
  );
}
