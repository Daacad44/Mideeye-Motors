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
  /** WaafiPay: the wallet number the PIN prompt went to (252…). */
  payerPhone?: string | null;
  /** WaafiPay: rejected | insufficient_funds | timeout | invalid_account | error */
  failureReason?: string | null;
}

export type PaymentProvider = 'waafipay' | 'manual' | 'mock';

export const paymentsApi = {
  /** Payment methods this deployment accepts (`mock` is off in production). */
  providers: () => http<{ data: PaymentProvider[] }>('/payments/providers'),

  /** `bookingReference` proves a guest owns the booking. */
  create: (payload: { bookingId: string; bookingReference: string; provider: PaymentProvider; reference?: string; payerPhone?: string }) =>
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
