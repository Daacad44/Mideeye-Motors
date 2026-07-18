import { Router } from 'express';
import { z } from 'zod';
import { CouponType, type Coupon } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const couponsRouter = Router();

/**
 * Server-authoritative coupon check. Given a coupon (or null), the rental
 * length and the pre-discount subtotal, return validity + the discount amount.
 * Used by both /validate and booking creation so the two never diverge.
 */
export function computeCouponDiscount(
  coupon: Coupon | null,
  days: number,
  subtotal: number,
): { valid: boolean; discount: number } {
  if (!coupon || !coupon.active) return { valid: false, discount: 0 };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { valid: false, discount: 0 };
  if (coupon.expiresAt && coupon.expiresAt < now) return { valid: false, discount: 0 };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { valid: false, discount: 0 };
  if (coupon.minDays != null && days < coupon.minDays) return { valid: false, discount: 0 };

  const raw = coupon.type === 'PERCENT' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  return { valid: true, discount: Math.max(0, Math.min(raw, subtotal)) };
}

// ── Public: validate a code for the current cart ──
couponsRouter.post('/validate', async (req, res) => {
  const parsed = z
    .object({ code: z.string().min(1), days: z.number().int().positive(), subtotal: z.number().int().nonnegative() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const coupon = await prisma.coupon.findUnique({ where: { code: parsed.data.code.trim().toUpperCase() } });
  const { valid, discount } = computeCouponDiscount(coupon, parsed.data.days, parsed.data.subtotal);
  if (!valid) return res.json({ data: { valid: false, message: 'This promo code is invalid or expired.' } });

  res.json({ data: { valid: true, code: coupon!.code, type: coupon!.type, value: coupon!.value, discount } });
});

// ── Admin CRUD ──
couponsRouter.use(authenticate, requireAdmin);

const couponSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.nativeEnum(CouponType),
  value: z.number().int().positive(),
  maxUses: z.number().int().positive().nullable().optional(),
  minDays: z.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional(),
});

couponsRouter.get('/', async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ data: coupons });
});

couponsRouter.post('/', async (req, res) => {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const code = d.code.trim().toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
  if (existing) return res.status(409).json({ error: 'A coupon with that code already exists.' });

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: d.type,
      value: d.value,
      maxUses: d.maxUses ?? null,
      minDays: d.minDays ?? null,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      active: d.active ?? true,
    },
  });
  await audit(req, 'COUPON_CREATE', 'Coupon', coupon.id, { code });
  res.status(201).json({ data: coupon });
});

const updateSchema = couponSchema.partial();

couponsRouter.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const coupon = await prisma.coupon.update({
    where: { id: req.params.id },
    data: {
      ...(d.code !== undefined ? { code: d.code.trim().toUpperCase() } : {}),
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(d.value !== undefined ? { value: d.value } : {}),
      ...(d.maxUses !== undefined ? { maxUses: d.maxUses } : {}),
      ...(d.minDays !== undefined ? { minDays: d.minDays } : {}),
      ...(d.startsAt !== undefined ? { startsAt: d.startsAt ? new Date(d.startsAt) : null } : {}),
      ...(d.expiresAt !== undefined ? { expiresAt: d.expiresAt ? new Date(d.expiresAt) : null } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  await audit(req, 'COUPON_UPDATE', 'Coupon', coupon.id, { code: coupon.code });
  res.json({ data: coupon });
});

couponsRouter.delete('/:id', async (req, res) => {
  const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id }, select: { id: true, code: true } });
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  await prisma.coupon.delete({ where: { id: coupon.id } });
  await audit(req, 'COUPON_DELETE', 'Coupon', coupon.id, { code: coupon.code });
  res.json({ ok: true });
});
