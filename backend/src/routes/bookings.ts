import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const bookingsRouter = Router();

const TAX_RATE = 0.05;

const schema = z.object({
  vehicleId: z.string(),
  pickupLocation: z.string(),
  dropoffLocation: z.string(),
  pickupDate: z.string(),
  returnDate: z.string(),
  extras: z.array(z.string()).default([]),
  insurance: z.string().default('basic'),
  extrasPerDay: z.number().default(0),
  insurancePerDay: z.number().default(0),
});

// POST /api/bookings — create a booking with server-side price calculation.
bookingsRouter.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const b = parsed.data;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: b.vehicleId } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const days = Math.max(
    1,
    Math.round((new Date(b.returnDate).getTime() - new Date(b.pickupDate).getTime()) / 86400000) || 1,
  );
  const subtotal = (vehicle.pricePerDay + b.extrasPerDay + b.insurancePerDay) * days;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const booking = await prisma.booking.create({
    data: {
      vehicleId: b.vehicleId,
      pickupLocation: b.pickupLocation,
      dropoffLocation: b.dropoffLocation,
      pickupDate: new Date(b.pickupDate),
      returnDate: new Date(b.returnDate),
      extras: b.extras,
      insurance: b.insurance,
      days,
      subtotal,
      tax,
      total,
      status: 'PENDING',
    },
  });

  res.status(201).json({ data: booking });
});
