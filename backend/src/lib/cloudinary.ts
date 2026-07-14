import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  resourceType: 'image' | 'video' | 'raw';
}

/** A small, optimized thumbnail URL derived from a publicId. */
export function thumbnailFor(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [{ width: 320, height: 200, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
  });
}

/**
 * Upload a buffer to Cloudinary. Cloudinary auto-optimizes (WebP/AVIF via
 * f_auto at delivery) and we request eager compression on ingest.
 */
export function uploadBuffer(buffer: Buffer, folder: string): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', overwrite: true, quality: 'auto' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          thumbnailUrl: thumbnailFor(result.public_id),
          width: result.width ?? 0,
          height: result.height ?? 0,
          bytes: result.bytes ?? 0,
          format: result.format ?? '',
          resourceType: (result.resource_type as UploadResult['resourceType']) ?? 'image',
        });
      },
    );
    stream.end(buffer);
  });
}

/** Delete an image by publicId. */
export function destroyImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId, { invalidate: true });
}

/**
 * Signature for direct (browser → Cloudinary) signed uploads.
 * Lets the admin panel upload large files without proxying through the API.
 */
export function signUpload(folder: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.cloudinary.apiSecret,
  );
  return {
    timestamp,
    signature,
    apiKey: env.cloudinary.apiKey,
    cloudName: env.cloudinary.cloudName,
    folder,
  };
}
