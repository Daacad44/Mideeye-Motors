/**
 * ImageKit URL builder — the single source of truth for every image URL in
 * the app. Transformations are URL-based (`?tr=...`), not pre-registered
 * named variants — the frontend builds the same `tr=` string the backend
 * uses (see backend/src/lib/imagekit.ts::PRESETS, duplicated here since the
 * frontend has no access to that server-only module).
 *
 * ImageKit serves AVIF/WebP automatically via `fo-auto`; no separate format
 * logic needed. `logo` gets no transformation at all — original quality,
 * no resize/crop, alpha preserved.
 */

export type Preset = 'hero' | 'card' | 'gallery' | 'team' | 'blogcover' | 'thumb' | 'logo';

const PRESET_TR: Record<Preset, string | null> = {
  hero: 'w-1920,h-1080,c-maintain_ratio,fo-auto,q-80',
  card: 'w-800,h-600,c-maintain_ratio,fo-auto,q-80',
  gallery: 'w-1600,h-1200,c-at_max,fo-auto,q-85',
  team: 'w-600,h-600,c-maintain_ratio,fo-auto,q-80',
  blogcover: 'w-1200,h-630,c-maintain_ratio,fo-auto,q-80',
  thumb: 'w-400,h-300,c-maintain_ratio,fo-auto,q-70',
  logo: null,
};

/** Approximate pixel width per preset — used only to build `srcset` width descriptors. */
export const PRESET_WIDTH: Record<Preset, number> = {
  hero: 1920,
  card: 800,
  gallery: 1600,
  team: 600,
  blogcover: 1200,
  thumb: 400,
  logo: 512,
};

const URL_ENDPOINT =
  (import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as string | undefined) || '';

/** Build an ImageKit delivery URL for a stored filePath + named preset. */
export function ik(filePath: string | undefined | null, preset: Preset = 'card'): string {
  if (!filePath || !URL_ENDPOINT) return '';
  const base = `${URL_ENDPOINT.replace(/\/+$/, '')}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
  const tr = PRESET_TR[preset];
  return tr ? `${base}?tr=${tr}` : base;
}

/**
 * Build a `srcset` across a set of presets for the same image — lets the
 * browser pick the smallest sufficient size. All presets share one filePath.
 */
export function ikSrcSet(filePath: string | undefined | null, presets: Preset[]): string {
  if (!filePath || !URL_ENDPOINT) return '';
  return presets.map((p) => `${ik(filePath, p)} ${PRESET_WIDTH[p]}w`).join(', ');
}

export const isImageKitConfigured = () => Boolean(URL_ENDPOINT);
