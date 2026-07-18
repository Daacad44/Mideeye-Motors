import { Router } from 'express';
import { z } from 'zod';
import { Category, Transmission, FuelType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../lib/redis.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';
import { isRangeBlocked } from '../lib/availability.js';
import { audit } from '../lib/audit.js';

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

/** Reviewer identity for the public review list — first name + last initial, never the email. */
function serializeReview(r: any) {
  const name: string = r.user?.name?.trim() || 'Guest';
  const [first, second] = name.split(/\s+/);
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    reviewer: second ? `${first} ${second[0]}.` : first,
  };
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Kebab-case slug from the title, suffixed -2, -3, … until unique. */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'vehicle';
  let slug = base;
  let n = 1;
  while (await prisma.vehicle.findUnique({ where: { slug }, select: { id: true } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/**
 * The user's most recent COMPLETED booking for this vehicle that hasn't been
 * reviewed yet — or null. This is the single source of truth for both review
 * eligibility (GET) and which booking a new review attaches to (POST), so the
 * `@unique` bookingId can never be violated.
 */
async function findReviewableBooking(vehicleId: string, userId: string): Promise<string | null> {
  const completed = await prisma.booking.findMany({
    where: { vehicleId, userId, status: 'COMPLETED' },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!completed.length) return null;
  const reviewed = await prisma.review.findMany({
    where: { bookingId: { in: completed.map((b) => b.id) } },
    select: { bookingId: true },
  });
  const reviewedSet = new Set(reviewed.map((r) => r.bookingId));
  return completed.find((b) => !reviewedSet.has(b.id))?.id ?? null;
}

/** Recompute + persist the vehicle's cached rating (avg) and reviews (count). */
async function recomputeVehicleRating(vehicleId: string) {
  const agg = await prisma.review.aggregate({
    where: { vehicleId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      reviews: agg._count._all,
    },
  });
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
// overlap check used when a booking is created (bookings AND maintenance).
vehiclesRouter.get('/:slug/availability', async (req, res) => {
  const from = new Date(String(req.query.from));
  const to = new Date(String(req.query.to));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return res.status(400).json({ error: 'Provide a valid from/to date range.' });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { slug: req.params.slug }, select: { id: true, availability: true } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const available = vehicle.availability && !(await isRangeBlocked(vehicle.id, from, to));
  res.json({ data: { available } });
});

// GET /api/vehicles/:id/calendar?from=&to= — busy ranges (non-cancelled bookings
// + maintenance) so the UI can show/booking-block dates. Public read.
vehiclesRouter.get('/:id/calendar', async (req, res) => {
  const now = new Date();
  const from = req.query.from ? new Date(String(req.query.from)) : now;
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(now.getTime() + 90 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return res.status(400).json({ error: 'Invalid from/to date range.' });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const [bookings, maintenance] = await Promise.all([
    prisma.booking.findMany({
      where: { vehicleId: vehicle.id, status: { not: 'CANCELLED' }, pickupDate: { lte: to }, returnDate: { gte: from } },
      select: { pickupDate: true, returnDate: true, status: true },
      orderBy: { pickupDate: 'asc' },
    }),
    prisma.vehicleMaintenance.findMany({
      where: { vehicleId: vehicle.id, fromDate: { lte: to }, toDate: { gte: from } },
      select: { id: true, fromDate: true, toDate: true, reason: true },
      orderBy: { fromDate: 'asc' },
    }),
  ]);

  const data = [
    ...bookings.map((b) => ({ from: b.pickupDate, to: b.returnDate, type: 'booking' as const, status: b.status })),
    ...maintenance.map((m) => ({ id: m.id, from: m.fromDate, to: m.toDate, type: 'maintenance' as const, reason: m.reason })),
  ];
  res.json({ data });
});

// GET /api/vehicles/:slug/reviews — public list (newest first). `canReview` is
// true only for an authenticated user with an unreviewed completed rental.
vehiclesRouter.get('/:slug/reviews', optionalAuthenticate, async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const reviews = await prisma.review.findMany({
    where: { vehicleId: vehicle.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const canReview = req.user ? !!(await findReviewableBooking(vehicle.id, req.user.id)) : false;
  res.json({ data: reviews.map(serializeReview), canReview });
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

// POST /api/vehicles/:slug/reviews — leave a review after a completed rental.
vehiclesRouter.post('/:slug/reviews', authenticate, async (req, res) => {
  const parsed = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const vehicle = await prisma.vehicle.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const bookingId = await findReviewableBooking(vehicle.id, req.user!.id);
  if (!bookingId) {
    return res.status(403).json({ error: 'You can review this vehicle only after a completed rental you haven’t reviewed yet.' });
  }

  const review = await prisma.review.create({
    data: { vehicleId: vehicle.id, userId: req.user!.id, bookingId, rating: parsed.data.rating, comment: parsed.data.comment ?? null },
    include: { user: { select: { name: true } } },
  });
  await recomputeVehicleRating(vehicle.id);
  await cacheInvalidate('vehicles:*'); // cached rating/reviews changed
  await audit(req, 'REVIEW_CREATE', 'Review', review.id, { vehicleId: vehicle.id, rating: review.rating });
  res.status(201).json({ data: serializeReview(review) });
});

// POST /api/vehicles (admin) — create a vehicle with an auto-generated unique slug.
const createSchema = z.object({
  title: z.string().min(1),
  category: z.nativeEnum(Category),
  brand: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  pricePerDay: z.number().int().positive(),
  pricePerWeek: z.number().int().positive(),
  pricePerMonth: z.number().int().positive(),
  transmission: z.nativeEnum(Transmission),
  fuelType: z.nativeEnum(FuelType),
  engine: z.string().min(1),
  horsePower: z.number().int().nonnegative(),
  seats: z.number().int().positive(),
  doors: z.number().int().positive(),
  color: z.string().min(1),
  mileage: z.string().min(1).default('Unlimited'),
  location: z.string().min(1),
  description: z.string().min(1),
  features: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  availability: z.boolean().default(true),
});

vehiclesRouter.post('/', authenticate, requireAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const slug = await uniqueSlug(parsed.data.title);
  const vehicle = await prisma.vehicle.create({ data: { ...parsed.data, slug }, include: vehicleInclude });
  await cacheInvalidate('vehicles:*');
  await audit(req, 'VEHICLE_CREATE', 'Vehicle', vehicle.id, { title: vehicle.title, slug });
  res.status(201).json({ data: serialize(vehicle) });
});

// PATCH — every field editable (core specs + pricing/featured/availability + hero/cover/thumb).
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.nativeEnum(Category).optional(),
  brand: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  pricePerDay: z.number().int().positive().optional(),
  pricePerWeek: z.number().int().positive().optional(),
  pricePerMonth: z.number().int().positive().optional(),
  transmission: z.nativeEnum(Transmission).optional(),
  fuelType: z.nativeEnum(FuelType).optional(),
  engine: z.string().min(1).optional(),
  horsePower: z.number().int().nonnegative().optional(),
  seats: z.number().int().positive().optional(),
  doors: z.number().int().positive().optional(),
  color: z.string().min(1).optional(),
  mileage: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  features: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  availability: z.boolean().optional(),
  heroImageId: z.string().nullable().optional(),
  coverImageId: z.string().nullable().optional(),
  thumbnailId: z.string().nullable().optional(),
});

// PATCH /api/vehicles/:id  (admin) — edit any field.
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

// DELETE /api/vehicles/:id (admin) — blocked while non-cancelled bookings exist.
vehiclesRouter.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id }, select: { id: true, title: true } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const activeBookings = await prisma.booking.count({ where: { vehicleId: vehicle.id, status: { not: 'CANCELLED' } } });
  if (activeBookings > 0) {
    return res.status(409).json({ error: 'This vehicle has active bookings and can’t be deleted. Set it unavailable instead.' });
  }

  // Only cancelled bookings remain; remove them (cascades their payments) so the
  // vehicle's restricted booking FK doesn't block the delete. Gallery, reviews
  // and maintenance cascade automatically.
  await prisma.$transaction([
    prisma.booking.deleteMany({ where: { vehicleId: vehicle.id } }),
    prisma.vehicle.delete({ where: { id: vehicle.id } }),
  ]);
  await cacheInvalidate('vehicles:*');
  await audit(req, 'VEHICLE_DELETE', 'Vehicle', vehicle.id, { title: vehicle.title });
  res.json({ ok: true });
});

// POST /api/vehicles/:id/maintenance (admin) — block a date range for maintenance.
vehiclesRouter.post('/:id/maintenance', authenticate, requireAdmin, async (req, res) => {
  const parsed = z.object({ fromDate: z.string(), toDate: z.string(), reason: z.string().max(500).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const from = new Date(parsed.data.fromDate);
  const to = new Date(parsed.data.toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return res.status(400).json({ error: 'Provide a valid maintenance range (end on or after start).' });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const block = await prisma.vehicleMaintenance.create({
    data: { vehicleId: vehicle.id, fromDate: from, toDate: to, reason: parsed.data.reason ?? null },
  });
  await cacheInvalidate('vehicles:*');
  await audit(req, 'MAINTENANCE_CREATE', 'VehicleMaintenance', block.id, { vehicleId: vehicle.id });
  res.status(201).json({ data: block });
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
