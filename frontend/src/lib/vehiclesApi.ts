import { http } from './http';
import type { Vehicle } from '@/types/vehicle';

export interface GallerySlot {
  mediaImageId: string; // MediaImage.id (internal), not the raw ImageKit fileId
  alt?: string;
  tag?: string;
  isHero?: boolean;
  isCover?: boolean;
}

export const vehiclesApi = {
  patch: (
    id: string,
    data: Partial<{
      pricePerDay: number;
      pricePerWeek: number;
      pricePerMonth: number;
      featured: boolean;
      availability: boolean;
      heroImageId: string | null;
      coverImageId: string | null;
      thumbnailId: string | null;
    }>,
  ) => http<{ data: Vehicle }>(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  putGallery: (id: string, gallery: GallerySlot[]) =>
    http<{ data: Vehicle }>(`/vehicles/${id}/gallery`, { method: 'PUT', body: JSON.stringify({ gallery }) }),
};
