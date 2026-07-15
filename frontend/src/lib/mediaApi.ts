import { http, uploadWithProgress } from './http';
import type { MediaImage } from '@/types/media';

export interface MediaListResponse {
  data: MediaImage[];
  total: number;
  page: number;
  perPage: number;
  folders: string[];
}

export type MediaSort = 'createdAt' | 'filePath' | 'size';

export const mediaApi = {
  list: (params: { search?: string; folder?: string; page?: number; sort?: MediaSort; order?: 'asc' | 'desc' } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.folder) q.set('folder', params.folder);
    if (params.page) q.set('page', String(params.page));
    if (params.sort) q.set('sort', params.sort);
    if (params.order) q.set('order', params.order);
    return http<MediaListResponse>(`/admin/media?${q.toString()}`);
  },

  /** Single-file upload. */
  upload: (
    file: File,
    meta: { folder?: string; altText?: string; caption?: string },
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (meta.folder) form.append('folder', meta.folder);
    if (meta.altText) form.append('altText', meta.altText);
    if (meta.caption) form.append('caption', meta.caption);
    return uploadWithProgress<{ data: MediaImage }>('/admin/media/upload', form, onProgress);
  },

  /** Multi-file / drag-and-drop bulk upload. */
  bulkUpload: (
    files: File[],
    meta: { folder?: string; altText?: string },
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    if (meta.folder) form.append('folder', meta.folder);
    if (meta.altText) form.append('altText', meta.altText);
    return uploadWithProgress<{ data: MediaImage[]; failed: { filename: string; error: string }[] }>(
      '/admin/media/bulk-upload',
      form,
      onProgress,
    );
  },

  update: (
    id: string,
    patch: Partial<Pick<MediaImage, 'altText' | 'caption' | 'folder' | 'tags'>> & { newFileName?: string },
  ) => http<{ data: MediaImage }>(`/admin/media/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  replace: (id: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return uploadWithProgress<{ data: MediaImage }>(`/admin/media/${id}/replace`, form, onProgress, 'PUT');
  },

  remove: (id: string, force = false) =>
    http<{ ok: true }>(`/admin/media/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),

  bulkDelete: (ids: string[], force = false) =>
    http<{ ok: true; deleted: number }>('/admin/media/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ ids, force }),
    }),
};
