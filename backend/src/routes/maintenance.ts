import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cacheInvalidate } from '../lib/redis.js';
import { audit } from '../lib/audit.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const maintenanceRouter = Router();

// DELETE /api/maintenance/:id (admin) — remove a maintenance block, freeing the dates.
maintenanceRouter.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const block = await prisma.vehicleMaintenance.findUnique({ where: { id: req.params.id }, select: { id: true, vehicleId: true } });
  if (!block) return res.status(404).json({ error: 'Maintenance block not found' });

  await prisma.vehicleMaintenance.delete({ where: { id: block.id } });
  await cacheInvalidate('vehicles:*');
  await audit(req, 'MAINTENANCE_DELETE', 'VehicleMaintenance', block.id, { vehicleId: block.vehicleId });
  res.json({ ok: true });
});
