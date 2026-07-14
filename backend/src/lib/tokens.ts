import crypto from 'node:crypto';
import type { Response } from 'express';
import { prisma } from './prisma.js';

const REFRESH_TTL_DAYS = 7;
const COOKIE_NAME = 'mm_refresh';

/** Issue an opaque refresh token, persist it, and set it as an httpOnly cookie. */
export async function issueRefreshToken(res: Response, userId: string) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TTL_DAYS * 86400000,
    path: '/api/auth',
  });
  return token;
}

/** Validate + rotate a refresh token. Returns the userId or null. */
export async function rotateRefreshToken(res: Response, oldToken?: string): Promise<string | null> {
  if (!oldToken) return null;
  const record = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!record || record.revoked || record.expiresAt < new Date()) return null;

  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  await issueRefreshToken(res, record.userId);
  return record.userId;
}

export async function revokeRefreshToken(res: Response, token?: string) {
  if (token) {
    await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } }).catch(() => {});
  }
  res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
}

export const REFRESH_COOKIE = COOKIE_NAME;
