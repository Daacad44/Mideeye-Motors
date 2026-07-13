import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../lib/redis.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const vehiclesRouter = Router();

/** Shape a Prisma vehicle (with images) into the API contract. */
function serialize(v: any) {
  return {
    ...v,
    gallery: (v.gallery ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((g: any) => ({ publicId: g.publicId, alt: g.alt, tag: g.tag })),
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
    include: { gallery: true },
    orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
  });

  const data = vehicles.map(serialize);
  await cacheSet(cacheKey, data, 60);
  res.json({ data });
});

// GET /api/vehicles/:slug
vehiclesRouter.get('/:slug', async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { slug: req.params.slug },
    include: { gallery: true },
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
  heroImage: z.string().optional(),
  coverImage: z.string().optional(),
  thumbnail: z.string().optional(),
});

// PATCH /api/vehicles/:id  (admin) — pricing / featured / availability / hero / cover
vehiclesRouter.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { gallery: true },
  });
  await cacheInvalidate('vehicles:*');
  res.json({ data: serialize(vehicle) });
});

// PUT /api/vehicles/:id/gallery  (admin) — replace/reorder gallery
vehiclesRouter.put('/:id/gallery', authenticate, requireAdmin, async (req, res) => {
  const schema = z.object({
    gallery: z.array(
      z.object({ publicId: z.string(), alt: z.string().default(''), tag: z.string().optional() }),
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await prisma.$transaction([
    prisma.vehicleImage.deleteMany({ where: { vehicleId: req.params.id } }),
    prisma.vehicleImage.createMany({
      data: parsed.data.gallery.map((g, i) => ({ ...g, position: i, vehicleId: req.params.id })),
    }),
  ]);
  await cacheInvalidate('vehicles:*');

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: req.params.id },
    include: { gallery: true },
  });
  res.json({ data: vehicle ? serialize(vehicle) : null });
});
