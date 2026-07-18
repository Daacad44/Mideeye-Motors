export type Currency = 'USD' | 'SOS';

/**
 * USD → SOS exchange rate, configurable at build time via VITE_USD_TO_SOS so it
 * can be updated without code changes. Prices are ALWAYS stored and charged in
 * USD on the server; SOS is a display-only conversion for reference.
 */
export const USD_TO_SOS = Number(import.meta.env.VITE_USD_TO_SOS) || 570;

/** Format a USD amount in the chosen display currency (whole units, no decimals). */
export function formatMoney(amountUsd: number, opts: { currency: Currency; rate?: number }): string {
  const rate = opts.rate ?? USD_TO_SOS;
  const currency = opts.currency;
  const amount = currency === 'SOS' ? Math.round(amountUsd * rate) : amountUsd;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
