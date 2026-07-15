/**
 * Server-side image validation by magic bytes (not filename/extension —
 * those are trivially spoofable). Only raster formats with well-defined
 * binary signatures are accepted; SVG is intentionally rejected even though
 * browsers render it as an image, because it's XML that can carry scripts
 * (stored-XSS risk) — PNG/WebP already cover the "preserve transparency"
 * requirement without that risk.
 */

const SIGNATURES: { mime: string; check: (b: Buffer) => boolean }[] = [
  { mime: 'image/png', check: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif', check: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  {
    mime: 'image/webp',
    check: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

/** Returns the sniffed mime type, or null if the buffer isn't a recognized/allowed image format. */
export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  const match = SIGNATURES.find((s) => s.check(buffer));
  return match?.mime ?? null;
}

export interface ValidationResult {
  ok: boolean;
  mime?: string;
  error?: string;
}

export function validateImageUpload(buffer: Buffer): ValidationResult {
  if (buffer.length === 0) return { ok: false, error: 'Empty file' };
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit` };
  }
  const mime = sniffImageMime(buffer);
  if (!mime) {
    return { ok: false, error: 'Unrecognized or unsupported image format (PNG, JPEG, GIF, WebP only)' };
  }
  return { ok: true, mime };
}
