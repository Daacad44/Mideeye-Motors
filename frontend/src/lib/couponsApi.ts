import { http } from './http';

export type CouponType = 'PERCENT' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  maxUses: number | null;
  usedCount: number;
  minDays: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface CouponPayload {
  code: string;
  type: CouponType;
  value: number;
  maxUses?: number | null;
  minDays?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active?: boolean;
}

export interface CouponValidation {
  valid: boolean;
  code?: string;
  type?: CouponType;
  value?: number;
  discount?: number;
  message?: string;
}

export const couponsApi = {
  list: () => http<{ data: Coupon[] }>('/coupons'),
  create: (payload: CouponPayload) => http<{ data: Coupon }>('/coupons', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<CouponPayload>) =>
    http<{ data: Coupon }>(`/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: string) => http<{ ok: true }>(`/coupons/${id}`, { method: 'DELETE' }),
  validate: (body: { code: string; days: number; subtotal: number }) =>
    http<{ data: CouponValidation }>('/coupons/validate', { method: 'POST', body: JSON.stringify(body) }),
};
