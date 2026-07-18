import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { authenticate, signAccessToken } from '../middleware/auth.js';
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken, REFRESH_COOKIE } from '../lib/tokens.js';
import { audit } from '../lib/audit.js';
import { notifyPasswordReset } from '../lib/notify.js';

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour, single-use

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function publicUser(u: { id: string; name: string; email: string; role: string; status: string }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, status: u.status };
}

authRouter.post('/register', async (req, res) => {
  const parsed = credentials.extend({ name: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await bcrypt.hash(parsed.data.password, 12),
      role: 'CUSTOMER',
    },
  });
  const token = signAccessToken({ id: user.id, role: user.role, email: user.email });
  await issueRefreshToken(res, user.id);
  await audit(req, 'USER_REGISTER', 'User', user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Account suspended. Contact a Super Admin.' });
  }
  const token = signAccessToken({ id: user.id, role: user.role, email: user.email });
  await issueRefreshToken(res, user.id);
  await audit(req, 'USER_LOGIN', 'User', user.id);
  res.json({ token, user: publicUser(user) });
});

// Exchange the refresh cookie for a new access token (and rotate the refresh token).
authRouter.post('/refresh', async (req, res) => {
  const userId = await rotateRefreshToken(res, req.cookies?.[REFRESH_COOKIE]);
  if (!userId) return res.status(401).json({ error: 'Invalid refresh token' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status === 'SUSPENDED') return res.status(401).json({ error: 'Unauthorized' });

  const token = signAccessToken({ id: user.id, role: user.role, email: user.email });
  res.json({ token, user: publicUser(user) });
});

authRouter.post('/logout', async (req, res) => {
  await revokeRefreshToken(res, req.cookies?.[REFRESH_COOKIE]);
  res.json({ ok: true });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  res.json({ user });
});

// POST /api/auth/forgot-password — always 200 (never reveal whether the email
// exists). If it does, issue a single-use, expiring token and email the link.
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    await notifyPasswordReset({
      to: user.email,
      name: user.name,
      link: `${env.frontendUrl}/reset-password?token=${token}`,
    });
    await audit(req, 'PASSWORD_RESET_REQUEST', 'User', user.id);
  }
  res.json({ ok: true });
});

// POST /api/auth/reset-password — consume the token, set the new password, and
// revoke existing sessions.
authRouter.post('/reset-password', async (req, res) => {
  const parsed = z.object({ token: z.string().min(1), password: z.string().min(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const record = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
  }

  const password = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
  ]);
  await audit(req, 'PASSWORD_RESET', 'User', record.userId);
  res.json({ ok: true });
});
