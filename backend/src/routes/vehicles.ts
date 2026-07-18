import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../lib/redis.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { hasBookingConflict } from '../lib/availability.js';

export const vehiclesRouter = Router();

export const vehicleInclude = {
  heroImage: true,
  coverImage: true,
  thumbnail: true,
  gallery: { orderBy: { displayOrder: 'asc' as const }, include: { image: true } },
};

/**
 * Shape a Prisma vehicle into the API contract. Every image field is a
 * `filePath` (ImageKit's stored path) — the frontend builds whichever
 * preset URL it needs (hero/card/gallery/thumb) via `tr=` params from that
 * single path; the API never pre-resolves one specific preset.
 */
export function serialize(v: any) {
  const { heroImageId, coverImageId, thumbnailId, heroImage, coverImage, thumbnail, gallery, ...rest } = v;
  return {
    ...rest,
    heroImage: heroImage ? { filePath: heroImage.filePath, alt: heroImage.altText } : null,
    coverImage: coverImage ? { filePath: coverImage.filePath, alt: coverImage.altText } : null,
    thumbnail: thumbnail ? { filePath: thumbnail.filePath, alt: thumbnail.altText } : null,
    gallery: (gallery ?? []).map((g: any) => ({
      filePath: g.image.filePath,
      alt: g.alt || g.image.altText,
      tag: g.tag,
      isHero: g.isHero,
      isCover: g.isCover,
      displayOrder: g.displayOrder,
    })),
  };
}

// GET /api/vehicles?featured=true&category=SUV
vehiclesRouter.get('/', async (req, res) => {
  const featured = req.query.featured === 'true';
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const cacheKey = `vehicles:${featured}:${category ?? 'all'}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ data: cached });

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...(featured ? { featured: true } : {}),
      ...(category ? { category: category as any } : {}),
    },
    include: vehicleInclude,
    orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
  });

  const data = vehicles.map(serialize);
  await cacheSet(cacheKey, data, 60);
  res.json({ data });
});

// GET /api/vehicles/:slug/availability?from=&to= — public date-range check so
// the checkout flow can validate before creating a booking. Runs the same
// overlap check used when a booking is created.
vehiclesRouter.get('/:slug/availability', async (req, res) => {
  const from = new Date(String(req.query.from));
  const to = new Date(String(req.query.to));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return res.status(400).json({ error: 'Provide a valid from/to date range.' });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { slug: req.params.slug }, select: { id: true, availability: true } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const available = vehicle.availability && !(await hasBookingConflict(vehicle.id, from, to));
  res.json({ data: { available } });
});

// GET /api/vehicles/:slug
vehiclesRouter.get('/:slug', async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { slug: req.params.slug },
    include: vehicleInclude,
  });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ data: serialize(vehicle) });
});

const updateSchema = z.object({
  pricePerDay: z.number().int().positive().optional(),
  pricePerWeek: z.number().int().positive().optional(),
  pricePerMonth: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
  availability: z.boolean().optional(),
  heroImageId: z.string().nullable().optional(),
  coverImageId: z.string().nullable().optional(),
  thumbnailId: z.string().nullable().optional(),
});

// PATCH /api/vehicles/:id  (admin) — pricing / featured / availability / hero / cover / thumbnail
vehiclesRouter.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: vehicleInclude,
  });
  await cacheInvalidate('vehicles:*');
  res.json({ data: serialize(vehicle) });
});

// PUT /api/vehicles/:id/gallery  (admin) — replace/reorder gallery
// Body references MediaImage rows by their internal `id` (not the raw ImageKit fileId).
vehiclesRouter.put('/:id/gallery', authenticate, requireAdmin, async (req, res) => {
  const schema = z.object({
    gallery: z.array(
      z.object({
        mediaImageId: z.string(),
        alt: z.string().default(''),
        tag: z.string().optional(),
        isHero: z.boolean().default(false),
        isCover: z.boolean().default(false),
      }),
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await prisma.$transaction([
    prisma.vehicleImage.deleteMany({ where: { vehicleId: req.params.id } }),
    prisma.vehicleImage.createMany({
      data: parsed.data.gallery.map((g, i) => ({
        imageId: g.mediaImageId,
        alt: g.alt,
        tag: g.tag,
        isHero: g.isHero,
        isCover: g.isCover,
        displayOrder: i,
        vehicleId: req.params.id,
      })),
    }),
  ]);
  await cacheInvalidate('vehicles:*');

  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id }, include: vehicleInclude });
  res.json({ data: vehicle ? serialize(vehicle) : null });
});
