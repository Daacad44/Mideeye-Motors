import { describe, expect, it } from 'vitest';
import { addOnsPerDay, PricingError, rentalDays, rentalSubtotal, round2, totals, TAX_RATE } from '../src/lib/pricing.js';

describe('rentalDays', () => {
  it('counts whole days, minimum 1', () => {
    expect(rentalDays(new Date('2026-12-01'), new Date('2026-12-04'))).toBe(3);
    expect(rentalDays(new Date('2026-12-01T08:00Z'), new Date('2026-12-01T12:00Z'))).toBe(1);
  });
});

describe('addOnsPerDay', () => {
  it('prices extras and insurance from the server catalog', () => {
    expect(addOnsPerDay(['driver', 'gps'], 'premium')).toEqual({
      extras: ['driver', 'gps'],
      extrasPerDay: 45,
      insurancePerDay: 18,
    });
  });

  it('counts a duplicated extra once', () => {
    expect(addOnsPerDay(['gps', 'gps'], 'basic').extrasPerDay).toBe(5);
  });

  it('rejects unknown extras and insurance tiers', () => {
    expect(() => addOnsPerDay(['free-car'], 'basic')).toThrow(PricingError);
    expect(() => addOnsPerDay([], 'platinum')).toThrow(PricingError);
  });
});

describe('totals', () => {
  it('applies the discount before tax', () => {
    expect(totals(1000, 100)).toEqual({ tax: Math.round(900 * TAX_RATE), total: 900 + Math.round(900 * TAX_RATE) });
  });

  it('never goes below zero', () => {
    expect(totals(100, 500)).toEqual({ tax: 0, total: 0 });
  });
});

describe('cent prices', () => {
  it('prices a $0.10/day test rate in cents', () => {
    const subtotal = rentalSubtotal(0.1, 0, 3);
    expect(subtotal).toBe(0.3);
    expect(totals(subtotal, 0)).toEqual({ tax: 0.02, total: 0.32 });
  });

  it('rounds to cents without float noise', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(rentalSubtotal(19.99, 5, 7)).toBe(174.93);
  });
});

describe('admin pricing catalog', () => {
  it('uses admin overrides for known options only', async () => {
    const { buildCatalog } = await import('../src/lib/pricing.js');
    const c = buildCatalog({ taxRate: 0.1, extrasPricing: { driver: 25.5, rocket: 99 }, insurancePricing: { premium: -3 } });
    expect(c.taxRate).toBe(0.1);
    expect(c.extras.driver).toBe(25.5);
    expect(c.extras).not.toHaveProperty('rocket');
    expect(c.insurance.premium).toBe(18); // invalid override falls back
    expect(addOnsPerDay(['driver'], 'basic', c).extrasPerDay).toBe(25.5);
    expect(totals(100, 0, c.taxRate)).toEqual({ tax: 10, total: 110 });
  });

  it('falls back to defaults when nothing is stored', async () => {
    const { buildCatalog, DEFAULT_CATALOG } = await import('../src/lib/pricing.js');
    expect(buildCatalog(null)).toEqual(DEFAULT_CATALOG);
  });
});
