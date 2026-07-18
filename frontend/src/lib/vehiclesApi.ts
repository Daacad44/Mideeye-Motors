import { http } from './http';
import type { Vehicle, VehicleCategory, Transmission, FuelType } from '@/types/vehicle';

export interface GallerySlot {
  mediaImageId: string; // MediaImage.id (internal), not the raw ImageKit fileId
  alt?: string;
  tag?: string;
  isHero?: boolean;
  isCover?: boolean;
}

/** All editable vehicle fields (create needs all; edit sends a Partial). */
export interface VehiclePayload {
  title: string;
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
  description: string;
  features: string[];
  featured: boolean;
  availability: boolean;
}

export type VehicleImageIds = {
  heroImageId: string | null;
  coverImageId: string | null;
  thumbnailId: string | null;
};

/** A busy date range from the calendar endpoint. */
export interface BusyRange {
  id?: string;
  from: string;
  to: string;
  type: 'booking' | 'maintenance';
  status?: string;
  reason?: string | null;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  fromDate: string;
  toDate: string;
  reason: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: string;
}

export const vehiclesApi = {
  create: (payload: VehiclePayload) =>
    http<{ data: Vehicle }>('/vehicles', { method: 'POST', body: JSON.stringify(payload) }),

  patch: (id: string, data: Partial<VehiclePayload & VehicleImageIds>) =>
    http<{ data: Vehicle }>(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id: string) => http<{ ok: true }>(`/vehicles/${id}`, { method: 'DELETE' }),

  putGallery: (id: string, gallery: GallerySlot[]) =>
    http<{ data: Vehicle }>(`/vehicles/${id}/gallery`, { method: 'PUT', body: JSON.stringify({ gallery }) }),

  // ── Availability calendar / maintenance ──
  getCalendar: (id: string, from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const q = qs.toString();
    return http<{ data: BusyRange[] }>(`/vehicles/${id}/calendar${q ? `?${q}` : ''}`);
  },
  addMaintenance: (id: string, body: { fromDate: string; toDate: string; reason?: string }) =>
    http<{ data: Maintenance }>(`/vehicles/${id}/maintenance`, { method: 'POST', body: JSON.stringify(body) }),
  removeMaintenance: (maintenanceId: string) =>
    http<{ ok: true }>(`/maintenance/${maintenanceId}`, { method: 'DELETE' }),

  // ── Reviews ──
  listReviews: (slug: string) =>
    http<{ data: Review[]; canReview: boolean }>(`/vehicles/${encodeURIComponent(slug)}/reviews`),
  addReview: (slug: string, body: { rating: number; comment?: string }) =>
    http<{ data: Review }>(`/vehicles/${encodeURIComponent(slug)}/reviews`, { method: 'POST', body: JSON.stringify(body) }),
};
