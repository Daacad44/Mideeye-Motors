import { Router } from 'express';
import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { cacheInvalidate } from '../lib/redis.js';
import { audit } from '../lib/audit.js';
import { authenticate, optionalAuthenticate, requireStaff } from '../middleware/auth.js';
import { hasBookingConflict } from '../lib/availability.js';
import { serialize as serializeVehicle, vehicleInclude } from './vehicles.js';

export const bookingsRouter = Router();

const TAX_RATE = 0.05;

/** A booking with its vehicle relation resolved to the API vehicle contract. */
function serialize(b: any) {
  const { vehicle, user, ...rest } = b;
  return {
    ...rest,
    vehicle: vehicle ? serializeVehicle(vehicle) : null,
    ...(user ? { user: { id: user.id, name: user.name, email: user.email } } : {}),
  };
}

const bookingInclude = { vehicle: { include: vehicleInclude } };

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
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

// POST /api/bookings — create a booking with server-side price calculation.
// Optional auth: a valid token links the booking to the user; otherwise it's a
// guest booking. Availability is enforced authoritatively before creating.
bookingsRouter.post('/', optionalAuthenticate, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const b = parsed.data;

  const pickup = new Date(b.pickupDate);
  const ret = new Date(b.returnDate);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime()) || ret <= pickup) {
    return res.status(400).json({ error: 'Return date must be after the pickup date.' });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: b.vehicleId } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (!vehicle.availability) {
    return res.status(409).json({ error: 'This vehicle is not currently available for booking.' });
  }
  if (await hasBookingConflict(vehicle.id, pickup, ret)) {
    return res.status(409).json({ error: 'This vehicle is already booked for the selected dates.' });
  }

  const days = Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / 86400000) || 1);
  const subtotal = (vehicle.pricePerDay + b.extrasPerDay + b.insurancePerDay) * days;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const booking = await prisma.booking.create({
    data: {
      vehicleId: b.vehicleId,
      userId: req.user?.id ?? null,
      customerName: b.name,
      customerEmail: b.email,
      customerPhone: b.phone,
      pickupLocation: b.pickupLocation,
      dropoffLocation: b.dropoffLocation,
      pickupDate: pickup,
      returnDate: ret,
      extras: b.extras,
      insurance: b.insurance,
      days,
      subtotal,
      tax,
      total,
      status: 'PENDING',
    },
    include: bookingInclude,
  });

  // A new booking changes the vehicle's date-range availability.
  await cacheInvalidate('vehicles:*');
  res.status(201).json({ data: serialize(booking) });
});

// GET /api/bookings — list ALL bookings (staff+), optional ?status / ?vehicleId.
bookingsRouter.get('/', authenticate, requireStaff, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const vehicleId = typeof req.query.vehicleId === 'string' ? req.query.vehicleId : undefined;
  if (status && !(status in BookingStatus)) {
    return res.status(400).json({ error: 'Invalid status filter' });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status ? { status: status as BookingStatus } : {}),
      ...(vehicleId ? { vehicleId } : {}),
    },
    include: { ...bookingInclude, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: bookings.map(serialize) });
});

// GET /api/bookings/me — the current user's bookings, newest first.
bookingsRouter.get('/me', authenticate, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: bookingInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: bookings.map(serialize) });
});

// GET /api/bookings/reference/:reference — public lookup for "track my booking".
bookingsRouter.get('/reference/:reference', async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { reference: req.params.reference },
    include: bookingInclude,
  });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json({ data: serialize(booking) });
});

// PATCH /api/bookings/:id/status — change status (staff+); writes an audit log.
bookingsRouter.patch('/:id/status', authenticate, requireStaff, async (req, res) => {
  const parsed = z.object({ status: z.nativeEnum(BookingStatus) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Booking not found' });

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    include: bookingInclude,
  });

  await audit(req, 'BOOKING_STATUS', 'Booking', booking.id, {
    from: existing.status,
    to: booking.status,
  });
  // Cancelling / completing frees the slot; any status change may affect availability.
  await cacheInvalidate('vehicles:*');
  res.json({ data: serialize(booking) });
});
