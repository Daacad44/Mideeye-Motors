import { http } from './http';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  bookingId: string;
  provider: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export type PaymentProvider = 'manual' | 'mock';

export const paymentsApi = {
  /** Payment methods this deployment accepts (`mock` is off in production). */
  providers: () => http<{ data: PaymentProvider[] }>('/payments/providers'),

  /** `bookingReference` proves a guest owns the booking. */
  create: (payload: { bookingId: string; bookingReference: string; provider: PaymentProvider; reference?: string }) =>
    http<{ data: Payment }>('/payments', { method: 'POST', body: JSON.stringify(payload) }),

  getForBooking: (bookingId: string, bookingReference: string) =>
    http<{ data: Payment[] }>(
      `/payments/booking/${encodeURIComponent(bookingId)}?reference=${encodeURIComponent(bookingReference)}`,
    ),

  verify: (id: string, status: 'PAID' | 'FAILED' | 'REFUNDED' = 'PAID') =>
    http<{ data: Payment }>(`/payments/${encodeURIComponent(id)}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
