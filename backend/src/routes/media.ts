import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { uploadBuffer, destroyImage } from '../lib/cloudinary.js';
import { authenticate, requireStaff, requireAdmin } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';
import { cacheInvalidate } from '../lib/redis.js';
import { env } from '../lib/env.js';

export const mediaRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Everything here requires an authenticated staff+ user.
mediaRouter.use(authenticate, requireStaff);

// ── LIST (search / filter / paginate) ──
mediaRouter.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  const vehicleId = typeof req.query.vehicleId === 'string' ? req.query.vehicleId : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 40));

  const where = {
    ...(folder ? { folder } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { altText: { contains: search, mode: 'insensitive' as const } },
            { publicId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total, folders] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({ distinct: ['folder'], select: { folder: true }, orderBy: { folder: 'asc' } }),
  ]);

  res.json({ data: items, total, page, perPage, folders: folders.map((f) => f.folder) });
});

// ── UPLOAD (single or multiple) ──
const metaSchema = z.object({
  folder: z.string().optional(),
  vehicleId: z.string().optional(),
  title: z.string().optional(),
  altText: z.string().optional(),
});

mediaRouter.post('/', upload.array('files', 20), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) return res.status(400).json({ error: 'No files provided' });

  const meta = metaSchema.parse(req.body);
  const folder = meta.folder?.trim() || `${env.cloudinary.folder}/media`;

  const created = [];
  for (const file of files) {
    let up;
    try {
      up = await uploadBuffer(file.buffer, folder);
    } catch (e) {
      const detail = (e as { message?: string })?.message || 'unknown error';
      return res.status(502).json({
        error: `Cloudinary upload failed (${detail}). Verify CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET.`,
      });
    }
    const asset = await prisma.mediaAsset.create({
      data: {
        title: meta.title || file.originalname.replace(/\.[^.]+$/, ''),
        altText: meta.altText || '',
        publicId: up.publicId,
        secureUrl: up.secureUrl,
        thumbnailUrl: up.thumbnailUrl,
        folder,
        resourceType: up.resourceType,
        format: up.format,
        width: up.width,
        height: up.height,
        bytes: up.bytes,
        vehicleId: meta.vehicleId || null,
        uploadedById: req.user!.id,
      },
    });
    created.push(asset);
    await audit(req, 'MEDIA_UPLOAD', 'MediaAsset', asset.id, { publicId: up.publicId, folder });
  }
  await cacheInvalidate('vehicles:*');
  res.status(201).json({ data: created });
});

// ── UPDATE metadata (rename / alt / order / hero / cover / move) ──
const patchSchema = z.object({
  title: z.string().optional(),
  altText: z.string().optional(),
  displayOrder: z.number().int().optional(),
  isHero: z.boolean().optional(),
  isCover: z.boolean().optional(),
  vehicleId: z.string().nullable().optional(),
});

mediaRouter.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const asset = await prisma.mediaAsset.update({ where: { id: req.params.id }, data: parsed.data });
  await audit(req, 'MEDIA_UPDATE', 'MediaAsset', asset.id, parsed.data);
  await cacheInvalidate('vehicles:*');
  res.json({ data: asset });
});

// ── REPLACE (upload new file, destroy old, keep same DB row) ──
mediaRouter.put('/:id/replace', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const existing = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Media not found' });

  let up;
  try {
    up = await uploadBuffer(req.file.buffer, existing.folder);
  } catch (e) {
    const detail = (e as { message?: string })?.message || 'unknown error';
    return res.status(502).json({
      error: `Cloudinary upload failed (${detail}). Verify your Cloudinary credentials.`,
    });
  }
  // Remove the old asset from Cloudinary if the publicId changed.
  if (up.publicId !== existing.publicId) {
    await destroyImage(existing.publicId).catch(() => {});
  }
  const asset = await prisma.mediaAsset.update({
    where: { id: req.params.id },
    data: {
      publicId: up.publicId,
      secureUrl: up.secureUrl,
      thumbnailUrl: up.thumbnailUrl,
      format: up.format,
      width: up.width,
      height: up.height,
      bytes: up.bytes,
    },
  });
  await audit(req, 'MEDIA_REPLACE', 'MediaAsset', asset.id, { old: existing.publicId, new: up.publicId });
  await cacheInvalidate('vehicles:*');
  res.json({ data: asset });
});

// ── DELETE (Cloudinary + DB, no orphans) ──
mediaRouter.delete('/:id', async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) return res.status(404).json({ error: 'Media not found' });

  await destroyImage(asset.publicId).catch(() => {});
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  await audit(req, 'MEDIA_DELETE', 'MediaAsset', asset.id, { publicId: asset.publicId });
  await cacheInvalidate('vehicles:*');
  res.json({ ok: true });
});

// ── BULK DELETE (admin+) ──
mediaRouter.post('/bulk-delete', requireAdmin, async (req, res) => {
  const parsed = z.object({ ids: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const assets = await prisma.mediaAsset.findMany({ where: { id: { in: parsed.data.ids } } });
  await Promise.all(assets.map((a) => destroyImage(a.publicId).catch(() => {})));
  await prisma.mediaAsset.deleteMany({ where: { id: { in: parsed.data.ids } } });
  await audit(req, 'MEDIA_BULK_DELETE', 'MediaAsset', undefined, { count: assets.length });
  await cacheInvalidate('vehicles:*');
  res.json({ ok: true, deleted: assets.length });
});
