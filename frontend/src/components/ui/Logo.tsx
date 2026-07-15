import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useLogoUrl } from '@/lib/branding';

/**
 * Renders the OFFICIAL Mideeye Motors logo PNG (from ImageKit via the branding API).
 *
 * There is intentionally NO text/CSS/SVG recreation of the logo. If the
 * official image has not been uploaded yet, we reserve the space with a
 * transparent placeholder rather than substituting a fake wordmark.
 *
 * `variant="light"` places the logo on a white chip for contrast on dark
 * surfaces, without altering the logo's own colours/proportions.
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
  const url = useLogoUrl();
  const [errored, setErrored] = useState(false);
  const showImage = url && !errored;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        variant === 'light' && 'rounded-xl bg-white px-2.5 py-1.5 shadow-sm',
        className,
      )}
      style={{ minHeight: height }}
    >
      {showImage ? (
        <img
          src={url}
          alt="Mideeye Motors & Rental Car Co."
          style={{ height }}
          className="w-auto object-contain"
          loading="eager"
          decoding="async"
          onError={() => setErrored(true)}
        />
      ) : (
        // Reserve space; never render generated text as the logo.
        <span
          aria-label="Mideeye Motors & Rental Car Co."
          role="img"
          style={{ height, width: height * 2.6 }}
          className="inline-block"
        />
      )}
    </span>
  );
}
