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

export const paymentsApi = {
  create: (payload: { bookingId: string; provider: 'manual' | 'mock'; reference?: string }) =>
    http<{ data: Payment }>('/payments', { method: 'POST', body: JSON.stringify(payload) }),

  getForBooking: (bookingId: string) =>
    http<{ data: Payment[] }>(`/payments/booking/${encodeURIComponent(bookingId)}`),

  verify: (id: string, status: 'PAID' | 'FAILED' | 'REFUNDED' = 'PAID') =>
    http<{ data: Payment }>(`/payments/${encodeURIComponent(id)}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
