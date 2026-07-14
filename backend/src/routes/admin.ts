import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

export const adminRouter = Router();

const ASSIGNABLE = ['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'] as const;
const select = { id: true, name: true, email: true, role: true, status: true, createdAt: true };

adminRouter.use(authenticate);

// ── List users (admin+) ──
adminRouter.get('/users', requireAdmin, async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: users });
});

// ── Recent audit logs (admin+) ──
adminRouter.get('/audit', requireAdmin, async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { actor: { select: { name: true, email: true, role: true } } },
  });
  res.json({ data: logs });
});

/* ── Everything below is SUPER ADMIN only ── */

// Create a staff/manager/admin account.
adminRouter.post('/users', requireSuperAdmin, async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(ASSIGNABLE),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role,
      createdById: req.user!.id,
    },
    select,
  });
  await audit(req, 'ADMIN_CREATE_USER', 'User', user.id, { role: user.role });
  res.status(201).json({ data: user });
});

// Guard: never allow acting on a SUPER_ADMIN account.
async function loadNonSuperAdmin(id: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: 404 as const };
  if (target.role === 'SUPER_ADMIN') return { error: 403 as const };
  return { target };
}

adminRouter.patch('/users/:id/role', requireSuperAdmin, async (req, res) => {
  const parsed = z.object({ role: z.enum(ASSIGNABLE) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { error } = await loadNonSuperAdmin(req.params.id);
  if (error === 404) return res.status(404).json({ error: 'User not found' });
  if (error === 403) return res.status(403).json({ error: 'Cannot modify a Super Admin' });

  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: parsed.data.role }, select });
  await audit(req, 'ADMIN_ASSIGN_ROLE', 'User', user.id, { role: user.role });
  res.json({ data: user });
});

adminRouter.patch('/users/:id/status', requireSuperAdmin, async (req, res) => {
  const parsed = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { error } = await loadNonSuperAdmin(req.params.id);
  if (error === 404) return res.status(404).json({ error: 'User not found' });
  if (error === 403) return res.status(403).json({ error: 'Cannot modify a Super Admin' });

  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: parsed.data.status }, select });
  // Revoke refresh tokens on suspend.
  if (parsed.data.status === 'SUSPENDED') {
    await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });
  }
  await audit(req, 'ADMIN_SET_STATUS', 'User', user.id, { status: user.status });
  res.json({ data: user });
});

adminRouter.post('/users/:id/reset-password', requireSuperAdmin, async (req, res) => {
  const parsed = z.object({ password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { error } = await loadNonSuperAdmin(req.params.id);
  if (error === 404) return res.status(404).json({ error: 'User not found' });
  if (error === 403) return res.status(403).json({ error: 'Cannot modify a Super Admin' });

  await prisma.user.update({
    where: { id: req.params.id },
    data: { password: await bcrypt.hash(parsed.data.password, 12) },
  });
  await prisma.refreshToken.updateMany({ where: { userId: req.params.id }, data: { revoked: true } });
  await audit(req, 'ADMIN_RESET_PASSWORD', 'User', req.params.id);
  res.json({ ok: true });
});

adminRouter.delete('/users/:id', requireSuperAdmin, async (req, res) => {
  const { error } = await loadNonSuperAdmin(req.params.id);
  if (error === 404) return res.status(404).json({ error: 'User not found' });
  if (error === 403) return res.status(403).json({ error: 'Cannot delete a Super Admin' });

  await prisma.user.delete({ where: { id: req.params.id } });
  await audit(req, 'ADMIN_DELETE_USER', 'User', req.params.id);
  res.json({ ok: true });
});
