import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { uploadImage, deleteImage, renameImage, ImageKitError } from '../lib/imagekit.js';
import { validateImageUpload, MAX_UPLOAD_BYTES } from '../lib/fileValidation.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';
import { cacheInvalidate } from '../lib/redis.js';

export const adminMediaRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });
const DEFAULT_FOLDER = '/mideeye-motors/media';

/** Format an ImageKit failure into a single, clean client-facing message. */
function ikErrorMessage(e: unknown): string {
  const msg = e instanceof ImageKitError ? e.message : 'ImageKit request failed';
  return /not configured/i.test(msg) ? msg : `${msg.replace(/\.?$/, '.')} Verify your ImageKit credentials.`;
}

// Every route here requires an authenticated staff+ user (Admin/Super Admin included).
adminMediaRouter.use(authenticate, requireStaff);

/** Resolve usage for list/detail responses (which vehicle/branding entry references each image). */
async function withUsage(image: { id: string }) {
  const [galleryUse, heroUse, coverUse, thumbUse, brandingUse] = await Promise.all([
    prisma.vehicleImage.findMany({ where: { imageId: image.id }, select: { vehicle: { select: { id: true, title: true } } } }),
    prisma.vehicle.findMany({ where: { heroImageId: image.id }, select: { id: true, title: true } }),
    prisma.vehicle.findMany({ where: { coverImageId: image.id }, select: { id: true, title: true } }),
    prisma.vehicle.findMany({ where: { thumbnailId: image.id }, select: { id: true, title: true } }),
    prisma.branding.findFirst({
      where: { OR: [{ logoImageId: image.id }, { faviconImageId: image.id }, { heroImageId: image.id }] },
    }),
  ]);
  const usedBy = [
    ...galleryUse.map((g) => ({ type: 'vehicle-gallery', id: g.vehicle.id, label: g.vehicle.title })),
    ...heroUse.map((v) => ({ type: 'vehicle-hero', id: v.id, label: v.title })),
    ...coverUse.map((v) => ({ type: 'vehicle-cover', id: v.id, label: v.title })),
    ...thumbUse.map((v) => ({ type: 'vehicle-thumbnail', id: v.id, label: v.title })),
    ...(brandingUse ? [{ type: 'branding', id: brandingUse.id, label: 'Site branding' }] : []),
  ];
  return { usedBy, inUse: usedBy.length > 0 };
}

// ── LIST (search / filter / sort / paginate) ──
adminMediaRouter.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
  const sort = (typeof req.query.sort === 'string' ? req.query.sort : 'createdAt') as
    | 'createdAt'
    | 'filePath'
    | 'size';
  const order = req.query.order === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 40));

  const where = {
    ...(folder ? { folder } : {}),
    ...(search
      ? {
          OR: [
            { filePath: { contains: search, mode: 'insensitive' as const } },
            { altText: { contains: search, mode: 'insensitive' as const } },
            { caption: { contains: search, mode: 'insensitive' as const } },
            { fileId: { contains: search, mode: 'insensitive' as const } },
            { tags: { has: search } },
          ],
        }
      : {}),
  };

  const [items, total, folders] = await Promise.all([
    prisma.mediaImage.findMany({ where, orderBy: { [sort]: order }, skip: (page - 1) * perPage, take: perPage }),
    prisma.mediaImage.count({ where }),
    prisma.mediaImage.findMany({ distinct: ['folder'], select: { folder: true } }),
  ]);

  const withInfo = await Promise.all(items.map(async (i) => ({ ...i, ...(await withUsage(i)) })));
  res.json({
    data: withInfo,
    total,
    page,
    perPage,
    folders: folders.map((f) => f.folder).filter(Boolean),
  });
});

adminMediaRouter.get('/:id', async (req, res) => {
  const image = await prisma.mediaImage.findUnique({ where: { id: req.params.id } });
  if (!image) return res.status(404).json({ error: 'Media not found' });
  res.json({ data: { ...image, ...(await withUsage(image)) } });
});

// ── UPLOAD (single) ──
const metaSchema = z.object({
  folder: z.string().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});

function parseTags(raw?: string): string[] | undefined {
  return raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
}

adminMediaRouter.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const meta = metaSchema.parse(req.body);
  const folder = meta.folder?.trim() || DEFAULT_FOLDER;

  const validation = validateImageUpload(req.file.buffer);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  let uploaded;
  try {
    uploaded = await uploadImage(req.file.buffer, req.file.originalname, folder, parseTags(meta.tags));
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
      altText: meta.altText ?? '',
      caption: meta.caption ?? '',
      folder,
      tags: parseTags(meta.tags) ?? [],
      uploadedById: req.user!.id,
    },
  });
  await audit(req, 'MEDIA_UPLOAD', 'MediaImage', image.id, { fileId: image.fileId, folder: image.folder });
  await cacheInvalidate('vehicles:*');
  res.status(201).json({ data: image });
});

// ── BULK UPLOAD ──
adminMediaRouter.post('/bulk-upload', upload.array('files', 20), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) return res.status(400).json({ error: 'No files provided' });
  const meta = metaSchema.parse(req.body);
  const folder = meta.folder?.trim() || DEFAULT_FOLDER;

  const created = [];
  const failed: { filename: string; error: string }[] = [];

  for (const file of files) {
    const validation = validateImageUpload(file.buffer);
    if (!validation.ok) {
      failed.push({ filename: file.originalname, error: validation.error! });
      continue;
    }
    try {
      const uploaded = await uploadImage(file.buffer, file.originalname, folder, parseTags(meta.tags));
      const image = await prisma.mediaImage.create({
        data: {
          fileId: uploaded.fileId,
          filePath: uploaded.filePath,
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl,
          width: uploaded.width,
          height: uploaded.height,
          size: file.size,
          mimeType: validation.mime,
          altText: meta.altText ?? '',
          folder,
          tags: parseTags(meta.tags) ?? [],
          uploadedById: req.user!.id,
        },
      });
      created.push(image);
      await audit(req, 'MEDIA_UPLOAD', 'MediaImage', image.id, { fileId: image.fileId, folder: image.folder });
    } catch (e) {
      failed.push({ filename: file.originalname, error: ikErrorMessage(e) });
    }
  }
  await cacheInvalidate('vehicles:*');
  res.status(created.length ? 201 : 502).json({ data: created, failed });
});

// ── UPDATE metadata (rename / alt / caption / folder / tags) ──
const patchSchema = z.object({
  newFileName: z.string().min(1).optional(), // triggers a real ImageKit rename
  altText: z.string().optional(),
  caption: z.string().optional(),
  folder: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

adminMediaRouter.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.mediaImage.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Media not found' });

  const { newFileName, ...rest } = parsed.data;
  let renameData: { filePath: string; url: string } | undefined;
  if (newFileName) {
    try {
      renameData = await renameImage(existing.filePath, newFileName);
    } catch (e) {
      return res.status(502).json({ error: ikErrorMessage(e) });
    }
  }

  const image = await prisma.mediaImage.update({
    where: { id: req.params.id },
    data: { ...rest, ...renameData },
  });

  await audit(req, 'MEDIA_UPDATE', 'MediaImage', image.id, { ...rest, renamed: !!renameData });
  await cacheInvalidate('vehicles:*');
  res.json({ data: image });
});

// ── REPLACE (new ImageKit asset, same DB row, old asset destroyed) ──
adminMediaRouter.put('/:id/replace', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const existing = await prisma.mediaImage.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Media not found' });

  const validation = validateImageUpload(req.file.buffer);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  let uploaded;
  try {
    uploaded = await uploadImage(req.file.buffer, req.file.originalname, existing.folder ?? DEFAULT_FOLDER);
  } catch (e) {
    return res.status(502).json({ error: ikErrorMessage(e) });
  }
  await deleteImage(existing.fileId).catch(() => {}); // best-effort cleanup of the old asset

  const image = await prisma.mediaImage.update({
    where: { id: req.params.id },
    data: {
      fileId: uploaded.fileId,
      filePath: uploaded.filePath,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl,
      width: uploaded.width,
      height: uploaded.height,
      size: req.file.size,
      mimeType: validation.mime,
    },
  });
  await audit(req, 'MEDIA_REPLACE', 'MediaImage', image.id, { old: existing.fileId, new: image.fileId });
  await cacheInvalidate('vehicles:*');
  res.json({ data: image });
});

// ── DELETE (ImageKit + DB; blocks if in use unless ?force=true) ──
adminMediaRouter.delete('/:id', async (req, res) => {
  const image = await prisma.mediaImage.findUnique({ where: { id: req.params.id } });
  if (!image) return res.status(404).json({ error: 'Media not found' });

  const { inUse, usedBy } = await withUsage(image);
  if (inUse && req.query.force !== 'true') {
    return res.status(409).json({ error: 'Image is in use', usedBy });
  }

  await deleteImage(image.fileId).catch(() => {});
  await prisma.mediaImage.delete({ where: { id: image.id } });
  await audit(req, 'MEDIA_DELETE', 'MediaImage', image.id, { fileId: image.fileId, forced: inUse });
  await cacheInvalidate('vehicles:*');
  res.json({ ok: true });
});

// ── BULK DELETE ──
adminMediaRouter.delete('/bulk-delete', async (req, res) => {
  const parsed = z.object({ ids: z.array(z.string()).min(1), force: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const images = await prisma.mediaImage.findMany({ where: { id: { in: parsed.data.ids } } });
  const usageChecks = await Promise.all(images.map((i) => withUsage(i)));
  const blocked = images.filter((_, i) => usageChecks[i].inUse);

  if (blocked.length && !parsed.data.force) {
    return res.status(409).json({
      error: `${blocked.length} image(s) are in use`,
      blocked: blocked.map((b) => b.id),
    });
  }

  await Promise.all(images.map((i) => deleteImage(i.fileId).catch(() => {})));
  await prisma.mediaImage.deleteMany({ where: { id: { in: images.map((i) => i.id) } } });
  await audit(req, 'MEDIA_BULK_DELETE', 'MediaImage', undefined, { count: images.length });
  await cacheInvalidate('vehicles:*');
  res.json({ ok: true, deleted: images.length });
});
