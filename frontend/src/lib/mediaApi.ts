import { http, uploadWithProgress } from './http';
import type { MediaAsset } from '@/types/media';

export interface MediaListResponse {
  data: MediaAsset[];
  total: number;
  page: number;
  perPage: number;
  folders: string[];
}

export const mediaApi = {
  list: (params: { search?: string; folder?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.folder) q.set('folder', params.folder);
    if (params.page) q.set('page', String(params.page));
    return http<MediaListResponse>(`/media?${q.toString()}`);
  },

  upload: (
    files: File[],
    meta: { folder?: string; vehicleId?: string; title?: string; altText?: string },
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    if (meta.folder) form.append('folder', meta.folder);
    if (meta.vehicleId) form.append('vehicleId', meta.vehicleId);
    if (meta.title) form.append('title', meta.title);
    if (meta.altText) form.append('altText', meta.altText);
    return uploadWithProgress<{ data: MediaAsset[] }>('/media', form, onProgress);
  },

  update: (id: string, patch: Partial<Pick<MediaAsset, 'title' | 'altText' | 'displayOrder' | 'isHero' | 'isCover'>>) =>
    http<{ data: MediaAsset }>(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  replace: (id: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return uploadWithProgress<{ data: MediaAsset }>(`/media/${id}/replace`, form, onProgress, 'PUT');
  },

  remove: (id: string) => http<{ ok: true }>(`/media/${id}`, { method: 'DELETE' }),

  bulkDelete: (ids: string[]) =>
    http<{ ok: true; deleted: number }>('/media/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};
