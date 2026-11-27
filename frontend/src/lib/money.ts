export type Currency = 'USD' | 'SOS';

/**
 * USD → SOS exchange rate, configurable at build time via VITE_USD_TO_SOS so it
 * can be updated without code changes. Prices are ALWAYS stored and charged in
 * USD on the server; SOS is a display-only conversion for reference.
 */
export const USD_TO_SOS = Number(import.meta.env.VITE_USD_TO_SOS) || 570;

/** Whole units for round amounts, cents when the amount has them (e.g. $0.10). */
export const fractionDigits = (amount: number) => (Number.isInteger(Math.round(amount * 100) / 100) ? 0 : 2);

/** Format a USD amount in the chosen display currency. */
export function formatMoney(amountUsd: number, opts: { currency: Currency; rate?: number }): string {
  const rate = opts.rate ?? USD_TO_SOS;
  const currency = opts.currency;
  const amount = currency === 'SOS' ? Math.round(amountUsd * rate) : amountUsd;
  const digits = currency === 'SOS' ? 0 : fractionDigits(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
}
