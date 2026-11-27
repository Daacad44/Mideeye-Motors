import { describe, expect, it } from 'vitest';
import { canAccessBooking, enabledProviders } from '../src/routes/payments.js';

const guestBooking = { userId: null, reference: 'ref_abc123' };
const ownedBooking = { userId: 'user_1', reference: 'ref_xyz789' };

describe('canAccessBooking', () => {
  it('lets staff and above access any booking', () => {
    for (const role of ['STAFF', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const) {
      expect(canAccessBooking(ownedBooking, { id: 'x', role, email: 'x@x.so' }, undefined)).toBe(true);
    }
  });

  it('lets the signed-in owner access their booking', () => {
    expect(canAccessBooking(ownedBooking, { id: 'user_1', role: 'CUSTOMER', email: 'a@a.so' }, undefined)).toBe(true);
  });

  it('refuses another customer', () => {
    expect(canAccessBooking(ownedBooking, { id: 'user_2', role: 'CUSTOMER', email: 'b@b.so' }, undefined)).toBe(false);
  });

  it('lets a guest in only with the matching booking reference', () => {
    expect(canAccessBooking(guestBooking, undefined, 'ref_abc123')).toBe(true);
    expect(canAccessBooking(guestBooking, undefined, 'wrong')).toBe(false);
    expect(canAccessBooking(guestBooking, undefined, undefined)).toBe(false);
  });
});

describe('enabledProviders', () => {
  it('hides the mock provider unless it is allowed', () => {
    expect(enabledProviders(false)).toEqual(['manual']);
    expect(enabledProviders(true)).toEqual(['manual', 'mock']);
  });
});
