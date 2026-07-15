import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { uploadImage, deleteImage, getUploadAuthParams, ImageKitError } from '../lib/imagekit.js';
import { validateImageUpload, MAX_UPLOAD_BYTES } from '../lib/fileValidation.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';
import { cacheInvalidate } from '../lib/redis.js';
import { env } from '../lib/env.js';

export const uploadRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });
const DEFAULT_FOLDER = '/mideeye-motors/uploads';

function ikErrorMessage(e: unknown): string {
  const msg = e instanceof ImageKitError ? e.message : 'ImageKit request failed';
  return /not configured/i.test(msg) ? msg : `${msg.replace(/\.?$/, '.')} Verify your ImageKit credentials.`;
}

// Every route here requires an authenticated staff+ user.
uploadRouter.use(authenticate, requireStaff);

// POST /api/upload — single-file proxy upload → ImageKit + MediaImage row.
uploadRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const folder = (typeof req.body.folder === 'string' && req.body.folder.trim()) || DEFAULT_FOLDER;

  const validation = validateImageUpload(req.file.buffer);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  let uploaded;
  try {
    uploaded = await uploadImage(req.file.buffer, req.file.originalname, folder);
  } catch (e) {
    return res.status(502).json({ error: ikErrorMessage(e) });
  }

  const image = await prisma.mediaImage.create({
    data: {
      fileId: uploaded.fileId,
      filePath: uploaded.filePath,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl,
      width: uploaded.width,
      height: uploaded.height,
      size: req.file.size,
      mimeType: validation.mime,
      folder,
      uploadedById: req.user!.id,
    },
  });
  await audit(req, 'MEDIA_UPLOAD', 'MediaImage', image.id, { fileId: image.fileId, folder });
  await cacheInvalidate('vehicles:*');
  res.status(201).json({ data: image });
});

// POST /api/upload/sign — admin-only. Short-lived auth params for a direct
// browser → ImageKit upload (the private key never leaves the server).
uploadRouter.post('/sign', (_req, res) => {
  if (!env.imagekit.configured) {
    return res.status(502).json({ error: 'ImageKit is not configured (IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY missing).' });
  }
  const params = getUploadAuthParams();
  res.json({ ...params, publicKey: env.imagekit.publicKey, urlEndpoint: env.imagekit.urlEndpoint });
});

// DELETE /api/upload/:fileId — admin-only. Removes from ImageKit and the DB row.
uploadRouter.delete('/:fileId', async (req, res) => {
  const image = await prisma.mediaImage.findUnique({ where: { fileId: req.params.fileId } });
  if (!image) return res.status(404).json({ error: 'Media not found' });

  const inUse = await prisma.$transaction([
    prisma.vehicleImage.count({ where: { imageId: image.id } }),
    prisma.vehicle.count({ where: { OR: [{ heroImageId: image.id }, { coverImageId: image.id }, { thumbnailId: image.id }] } }),
    prisma.branding.count({ where: { OR: [{ logoImageId: image.id }, { faviconImageId: image.id }, { heroImageId: image.id }] } }),
  ]).then(([a, b, c]) => a + b + c > 0);

  if (inUse && req.query.force !== 'true') {
    return res.status(409).json({ error: 'Image is in use. Pass ?force=true to delete anyway.' });
  }

  await deleteImage(image.fileId).catch(() => {});
  await prisma.mediaImage.delete({ where: { id: image.id } });
  await audit(req, 'MEDIA_DELETE', 'MediaImage', image.id, { fileId: image.fileId, forced: inUse });
  await cacheInvalidate('vehicles:*');
  res.json({ ok: true });
});
