import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';

/** Higher number = more privilege. */
export const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  STAFF: 40,
  CUSTOMER: 10,
};

export interface AuthPayload {
  id: string;
  role: Role;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '15m' });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(header.slice(7), env.jwtSecret) as AuthPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Attach `req.user` when a valid Bearer token is present, but never reject —
 * an absent or invalid token simply proceeds as a guest. Used by endpoints
 * (e.g. guest checkout) that behave differently when signed in but don't
 * require it.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), env.jwtSecret) as AuthPayload;
    } catch {
      /* ignore — proceed unauthenticated */
    }
  }
  next();
}

/** Require the caller to have at least one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/** Require a minimum privilege rank (role hierarchy). */
export function requireMinRank(min: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (ROLE_RANK[req.user.role] < ROLE_RANK[min]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Convenience guards
export const requireStaff = requireMinRank('STAFF');
export const requireAdmin = requireMinRank('ADMIN');
export const requireSuperAdmin = requireRole('SUPER_ADMIN');
