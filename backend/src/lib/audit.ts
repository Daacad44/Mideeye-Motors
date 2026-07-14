import type { Request } from 'express';
import { prisma } from './prisma.js';

/**
 * Write an audit log entry. Best-effort — never throws into the request path.
 */
export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        metadata: metadata as any,
        ip: req.ip ?? req.socket.remoteAddress ?? null,
        actorId: req.user?.id ?? null,
      },
    });
  } catch {
    /* swallow — auditing must not break the operation */
  }
}
