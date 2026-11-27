import type { Vehicle, VehicleGalleryImage } from '@/types/vehicle';

/**
 * Real photos that ship with the site (public/images/fleet/<slug>/…).
 *
 * They are used only while a vehicle has no photos in ImageKit yet. As soon as
 * an admin uploads photos for that vehicle in the Media Library, the uploaded
 * ones win and these are ignored. A vehicle with neither shows the Daljir
 * placeholder — never another car's photo.
 */
type Shot = { file: string; alt: string; tag: string };

const PHOTOS: Record<string, Shot[]> = {
  'toyota-prado-tx': [
    { file: 'front-three-quarter.webp', alt: 'Toyota Prado TX, front three-quarter view', tag: 'front' },
    { file: 'side.webp', alt: 'Toyota Prado TX, side profile', tag: 'side' },
    { file: 'rear-three-quarter.webp', alt: 'Toyota Prado TX, rear three-quarter view', tag: 'rear' },
    { file: 'interior.webp', alt: 'Toyota Prado TX, leather interior', tag: 'interior' },
    { file: 'dashboard.webp', alt: 'Toyota Prado TX, dashboard', tag: 'dashboard' },
  ],
};

/** The vehicle the home page features in its hero and spotlight. */
export const SPOTLIGHT_SLUG = 'toyota-prado-tx';

const path = (slug: string, file: string) => `/images/fleet/${slug}/${file}`;

/** Bundled hero background (landscape) and its portrait crop for phones. */
export const HERO_PHOTO = {
  landscape: path(SPOTLIGHT_SLUG, 'front-three-quarter.webp'),
  portrait: path(SPOTLIGHT_SLUG, 'front-portrait.webp'),
  rear: path(SPOTLIGHT_SLUG, 'rear-three-quarter.webp'),
  alt: 'Toyota Prado TX',
};

export function withBundledPhotos(v: Vehicle): Vehicle {
  const shots = PHOTOS[v.slug];
  const hasUploads = Boolean(v.heroImage || v.coverImage || v.thumbnail || v.gallery?.length);
  if (!shots || hasUploads) return v;

  const ref = (s: Shot) => ({ filePath: path(v.slug, s.file), alt: s.alt });
  const byTag = (tag: string) => shots.find((s) => s.tag === tag) ?? shots[0];
  const gallery: VehicleGalleryImage[] = shots.map((s, i) => ({
    ...ref(s),
    tag: s.tag,
    isHero: i === 0,
    isCover: s.tag === 'side',
    displayOrder: i,
  }));

  return {
    ...v,
    heroImage: ref(byTag('front')),
    // Side profile on black: reads best on the dark cards.
    coverImage: ref(byTag('side')),
    thumbnail: ref(byTag('side')),
    gallery,
  };
}
