import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

/** Upload a buffer to Cloudinary under a vehicle folder; returns the publicId. */
export function uploadBuffer(
  buffer: Buffer,
  folder: string,
): Promise<{ publicId: string; url: string; width?: number; height?: number }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', overwrite: true },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
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
