import ImageKitSDK from 'imagekit';
import { env } from './env.js';

/**
 * ImageKit client — server-side only. Uploads/deletes go through the
 * official SDK (needs the private key, signed requests); delivery URLs are
 * hand-built strings so the exact same `tr=` logic can be mirrored by the
 * frontend (which never sees the SDK or the private key).
 */

let client: ImageKitSDK | null = null;
function sdk(): ImageKitSDK {
  if (!client) {
    client = new ImageKitSDK({
      publicKey: env.imagekit.publicKey,
      privateKey: env.imagekit.privateKey,
      urlEndpoint: env.imagekit.urlEndpoint,
    });
  }
  return client;
}

export class ImageKitError extends Error {
  constructor(message: string, public detail?: unknown) {
    super(message);
    this.name = 'ImageKitError';
  }
}

function assertConfigured() {
  if (!env.imagekit.configured) {
    throw new ImageKitError('ImageKit is not configured (IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY missing).');
  }
}

export type Preset = 'hero' | 'card' | 'gallery' | 'team' | 'blogcover' | 'thumb' | 'logo';

/** Canonical `tr=` transformation strings per named preset. Kept in sync
 * with `frontend/src/lib/imagekitImages.ts` — the frontend hand-builds the
 * identical query string from this same mapping (duplicated intentionally;
 * the frontend has no access to this server-only module). */
export const PRESETS: Record<Preset, string | null> = {
  hero: 'w-1920,h-1080,c-maintain_ratio,fo-auto,q-80',
  card: 'w-800,h-600,c-maintain_ratio,fo-auto,q-80',
  gallery: 'w-1600,h-1200,c-at_max,fo-auto,q-85',
  team: 'w-600,h-600,c-maintain_ratio,fo-auto,q-80',
  blogcover: 'w-1200,h-630,c-maintain_ratio,fo-auto,q-80',
  thumb: 'w-400,h-300,c-maintain_ratio,fo-auto,q-70',
  // logo: no transformation — original quality, no resize/crop, alpha preserved.
  logo: null,
};

/** Build a delivery URL for a stored filePath + named preset. */
export function buildImageUrl(filePath: string, preset: Preset = 'card'): string {
  const base = `${env.imagekit.urlEndpoint.replace(/\/+$/, '')}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
  const tr = PRESETS[preset];
  return tr ? `${base}?tr=${tr}` : base;
}

export interface IkUploadResult {
  fileId: string;
  filePath: string;
  url: string;
  thumbnailUrl: string | null;
  width?: number;
  height?: number;
}

/** Upload a buffer to ImageKit under a (real) folder. */
export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  folder: string,
  tags?: string[],
): Promise<IkUploadResult> {
  assertConfigured();
  try {
    const res = await sdk().upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: true,
      tags,
    });
    return {
      fileId: res.fileId,
      filePath: res.filePath,
      url: res.url,
      thumbnailUrl: res.thumbnailUrl ?? null,
      width: res.width,
      height: res.height,
    };
  } catch (e) {
    const msg = (e as { message?: string })?.message || 'ImageKit upload failed';
    throw new ImageKitError(msg, e);
  }
}

/** Permanently delete a file from ImageKit. */
export async function deleteImage(fileId: string): Promise<void> {
  assertConfigured();
  try {
    await sdk().deleteFile(fileId);
  } catch (e) {
    const msg = (e as { message?: string })?.message || 'ImageKit delete failed';
    throw new ImageKitError(msg, e);
  }
}

/** Short-lived auth params for a direct browser → ImageKit upload. */
export function getUploadAuthParams() {
  assertConfigured();
  return sdk().getAuthenticationParameters();
}

/**
 * Rename a file in place (same folder, new filename). ImageKit's rename API
 * only returns a purge-cache request id, not the new path/URL — both are
 * deterministic (same folder, swapped filename), so we compute them here.
 */
export async function renameImage(
  filePath: string,
  newFileName: string,
): Promise<{ filePath: string; url: string }> {
  assertConfigured();
  const safeName = newFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  try {
    await sdk().renameFile({ filePath, newFileName: safeName, purgeCache: true });
  } catch (e) {
    const msg = (e as { message?: string })?.message || 'ImageKit rename failed';
    throw new ImageKitError(msg, e);
  }
  const folder = filePath.slice(0, filePath.lastIndexOf('/'));
  const newFilePath = `${folder}/${safeName}`;
  return { filePath: newFilePath, url: `${env.imagekit.urlEndpoint.replace(/\/+$/, '')}${newFilePath}` };
}
