/** Shared vehicle domain types (mirrors the API response shape). */

export type VehicleCategory =
  | 'SUV'
  | 'Sedan'
  | 'Luxury'
  | 'Pickup'
  | 'Electric'
  | 'Van';

export type Transmission = 'Automatic' | 'Manual';
export type FuelType = 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';

/**
 * A single image reference is just an ImageKit `filePath` plus lightweight
 * metadata. The delivery URL is derived at render time via
 * `ik(filePath, preset)` — the same filePath can render at any named
 * preset (hero/card/gallery/thumb) with zero extra requests or re-uploads.
 */
export type VehicleImageRef = {
  filePath: string;
  alt: string;
} | null;

export type VehicleGalleryImage = {
  filePath: string;
  alt: string;
  /** front | rear | side | left | right | interior | exterior | dashboard | engine | wheel | 360 | thumbnail | gallery */
  tag?: string;
  isHero: boolean;
  isCover: boolean;
  displayOrder: number;
};

export interface Vehicle {
  id: string;
  title: string;
  slug: string;
  category: VehicleCategory;
  brand: string;
  year: number;

  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;

  transmission: Transmission;
  fuelType: FuelType;
  engine: string;
  horsePower: number;
  seats: number;
  doors: number;
  color: string;
  mileage: string;
  location: string;

  rating: number;
  reviews: number;
  availability: boolean;
  featured: boolean;

  description: string;
  features: string[];

  // ── ImageKit (single source of truth) ──
  heroImage: VehicleImageRef;
  coverImage: VehicleImageRef;
  thumbnail: VehicleImageRef;
  gallery: VehicleGalleryImage[];
}
