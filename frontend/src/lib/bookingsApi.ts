import { http } from './http';
import type { Vehicle } from '@/types/vehicle';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: string;
  reference: string;
  vehicleId: string;
  userId: string | null;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  returnDate: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  extras: string[];
  insurance: string;
  days: number;
  subtotal: number;
  tax: number;
  total: number;
  status: BookingStatus;
  createdAt: string;
  vehicle: Vehicle | null;
  /** Present on the admin list only (the account the booking is linked to). */
  user?: { id: string; name: string; email: string };
}

export interface CreateBookingPayload {
  vehicleId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  returnDate: string;
  extras: string[];
  insurance: string;
  /** Per-day add-on rates — the server recomputes the authoritative total. */
  extrasPerDay: number;
  insurancePerDay: number;
  name: string;
  email: string;
  phone: string;
}

export const bookingsApi = {
  create: (payload: CreateBookingPayload) =>
    http<{ data: Booking }>('/bookings', { method: 'POST', body: JSON.stringify(payload) }),

  listMine: () => http<{ data: Booking[] }>('/bookings/me'),

  getByReference: (ref: string) =>
    http<{ data: Booking }>(`/bookings/reference/${encodeURIComponent(ref)}`),

  listAll: (params?: { status?: string; vehicleId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.vehicleId) qs.set('vehicleId', params.vehicleId);
    const q = qs.toString();
    return http<{ data: Booking[] }>(`/bookings${q ? `?${q}` : ''}`);
  },

  setStatus: (id: string, status: BookingStatus) =>
    http<{ data: Booking }>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  checkAvailability: (slug: string, from: string, to: string) =>
    http<{ data: { available: boolean } }>(
      `/vehicles/${encodeURIComponent(slug)}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
};
