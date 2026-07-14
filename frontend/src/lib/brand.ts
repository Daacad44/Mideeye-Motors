/**
 * Official brand assets — served exclusively from Cloudinary.
 *
 * The official Mideeye Motors logo is NOT stored in the repo, /public, or any
 * local folder. It lives in Cloudinary under a fixed publicId and is uploaded
 * once via the Admin Media Manager. Change it there and it updates everywhere
 * with zero code changes — same contract as every other image in the app.
 */
export const LOGO_PUBLIC_ID =
  (import.meta.env.VITE_LOGO_PUBLIC_ID as string | undefined) ??
  'mideeye-motors/brand/logo';

export const BRAND_NAME = 'MIDEEYE MOTORS';
export const BRAND_SUB = '& Rental Car Co.';
