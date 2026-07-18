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
