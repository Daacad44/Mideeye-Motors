/**
 * Cloudinary URL builder — the single source of truth for every image URL.
 *
 * WHY THIS EXISTS
 * ---------------
 * The frontend never hardcodes an image URL. It stores a Cloudinary
 * `publicId` per vehicle image and derives the delivery URL on the fly.
 * Because the URL is keyed on the *publicId* (not a versioned/immutable URL),
 * re-uploading to the same publicId in Cloudinary makes the new image appear
 * everywhere on the site instantly — no code change, no redeploy.
 *
 * Transformations (resize, crop, quality, format) are appended per call, so a
 * single stored publicId powers the thumbnail, card, hero and lightbox with
 * the optimal bytes for each surface.
 */

const CLOUD_NAME =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) || 'demo';

const BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

export type CldOptions = {
  width?: number;
  height?: number;
  /** crop / resize mode */
  crop?: 'fill' | 'fit' | 'pad' | 'scale' | 'thumb' | 'limit';
  gravity?: 'auto' | 'center' | 'face';
  /** device pixel ratio, e.g. 2 for retina */
  dpr?: number;
  /** quality — number or "auto" */
  quality?: number | 'auto';
  /** format — "auto" negotiates AVIF/WebP per browser */
  format?: 'auto' | 'png' | 'webp' | 'avif' | 'jpg';
  /** keep transparency (studio PNG cutouts) */
  background?: string;
  blur?: number;
  radius?: number | 'max';
};

/**
 * Build a delivery URL for a Cloudinary publicId with transformations.
 * If `publicId` is already a full URL (legacy/edge case), it is returned as-is.
 */
export function cld(publicId: string | undefined | null, opts: CldOptions = {}): string {
  if (!publicId) return '';
  if (/^https?:\/\//.test(publicId)) return publicId;

  const t: string[] = [];
  if (opts.crop) t.push(`c_${opts.crop}`);
  if (opts.gravity) t.push(`g_${opts.gravity}`);
  if (opts.width) t.push(`w_${Math.round(opts.width)}`);
  if (opts.height) t.push(`h_${Math.round(opts.height)}`);
  if (opts.dpr) t.push(`dpr_${opts.dpr}`);
  if (opts.background) t.push(`b_${opts.background}`);
  if (opts.blur) t.push(`e_blur:${opts.blur}`);
  if (opts.radius !== undefined) t.push(`r_${opts.radius}`);
  t.push(`q_${opts.quality ?? 'auto'}`);
  t.push(`f_${opts.format ?? 'auto'}`);

  const clean = publicId.replace(/^\/+/, '');
  return `${BASE}/${t.join(',')}/${clean}`;
}

/**
 * A responsive `srcSet` string across common widths — lets the browser pick
 * the smallest sufficient image. All variants share one publicId.
 */
export function cldSrcSet(
  publicId: string | undefined | null,
  widths: number[] = [480, 768, 1024, 1440, 1920],
  opts: CldOptions = {},
): string {
  if (!publicId) return '';
  return widths
    .map((w) => `${cld(publicId, { ...opts, width: w })} ${w}w`)
    .join(', ');
}

/** Tiny blurred placeholder for progressive loading. */
export function cldBlur(publicId: string | undefined | null): string {
  return cld(publicId, { width: 40, quality: 30, blur: 400 });
}

export const isCloudinaryConfigured = () => CLOUD_NAME !== 'demo';
