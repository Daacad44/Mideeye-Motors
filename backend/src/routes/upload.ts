import { Router } from 'express';
import multer from 'multer';
import { uploadBuffer, destroyImage, signUpload } from '../lib/cloudinary.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

/**
 * POST /api/upload — proxy upload a single image to Cloudinary.
 * Returns the publicId; the frontend derives all sizes from it.
 * (Admin-guarded in production; open in dev for the demo admin panel.)
 */
uploadRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const folder = (req.body.folder as string) || 'mideeye-motors/uploads';
  try {
    const result = await uploadBuffer(req.file.buffer, folder);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', detail: (err as Error).message });
  }
});

/** POST /api/upload/sign — signature for direct browser→Cloudinary uploads. */
uploadRouter.post('/sign', authenticate, requireAdmin, (req, res) => {
  const folder = (req.body.folder as string) || 'mideeye-motors/uploads';
  res.json(signUpload(folder));
});

/** DELETE /api/upload/:publicId — remove an image from Cloudinary. */
uploadRouter.delete('/:publicId(*)', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await destroyImage(req.params.publicId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', detail: (err as Error).message });
  }
});
