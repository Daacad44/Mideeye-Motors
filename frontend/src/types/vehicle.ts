/** Shared vehicle domain types (mirrors the Prisma model on the backend). */

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
 * A single image is stored as a Cloudinary publicId plus lightweight metadata.
 * The delivery URL is derived at render time via `cld(publicId, …)`, so a
 * Cloudinary re-upload to the same publicId updates the site with zero code.
 */
export type VehicleImage = {
  publicId: string;
  alt: string;
  /** e.g. "front" | "rear" | "side" | "interior" | "dashboard" | "wheel" | "engine" */
  tag?: string;
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

  /** Cloudinary bookkeeping */
  cloudinaryFolder: string;
  heroImage: string; // publicId
  coverImage: string; // publicId
  thumbnail: string; // publicId
  gallery: VehicleImage[];
}
