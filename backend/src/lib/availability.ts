import { prisma } from './prisma.js';

/**
 * True if the vehicle already has a non-cancelled booking whose
 * [pickupDate, returnDate] range overlaps [from, to]. Two ranges overlap when
 * each starts on or before the other ends. CANCELLED bookings free the slot.
 */
export async function hasBookingConflict(vehicleId: string, from: Date, to: Date): Promise<boolean> {
  const overlap = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { not: 'CANCELLED' },
      pickupDate: { lte: to },
      returnDate: { gte: from },
    },
    select: { id: true },
  });
  return !!overlap;
}

/** True if a maintenance window overlaps [from, to] for the vehicle. */
export async function hasMaintenanceConflict(vehicleId: string, from: Date, to: Date): Promise<boolean> {
  const overlap = await prisma.vehicleMaintenance.findFirst({
    where: {
      vehicleId,
      fromDate: { lte: to },
      toDate: { gte: from },
    },
    select: { id: true },
  });
  return !!overlap;
}

/**
 * The single availability gate used across booking creation and the public
 * availability endpoint: a range is blocked by either an existing booking
 * (Wave 1) or a maintenance window (Wave 3).
 */
export async function isRangeBlocked(vehicleId: string, from: Date, to: Date): Promise<boolean> {
  return (await hasBookingConflict(vehicleId, from, to)) || (await hasMaintenanceConflict(vehicleId, from, to));
}
