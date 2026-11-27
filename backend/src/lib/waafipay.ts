import { randomUUID } from 'node:crypto';

/**
 * WaafiPay mobile-wallet checkout (EVC Plus / Hormuud, ZAAD / Telesom,
 * SAHAL / Golis, WAAFI app). Follows https://docs.waafipay.com/purchase-api.
 *
 * `API_PURCHASE` (POST {apiUrl}, e.g. https://api.waafipay.net/asm or the
 * sandbox https://sandbox.waafipay.com/asm) sends a push request to the
 * customer's phone and the HTTP call only returns once they approve with their
 * PIN, reject, or time out — so callers must run it in the background, never
 * inside a web request.
 *
 * responseCode 2001 only means "request processed": the payment went through
 * only when params.state is APPROVED.
 */

/** How long to wait for the customer's PIN before giving up (WaafiPay allows 5 minutes). */
export const WAAFI_TIMEOUT_MS = 5 * 60_000 + 15_000;

/** WaafiPay timestamp, e.g. "2026-11-28 09:04:44" (UTC). */
export function waafiTimestamp(d = new Date()): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export interface WaafiConfig {
  merchantUid: string;
  apiUserId: string;
  apiKey: string;
  apiUrl: string;
}

export type WaafiResult =
  | { ok: true; transactionId: string; raw: unknown }
  | { ok: false; reason: WaafiFailure; message: string; raw: unknown };

/** Why a payment did not go through — mapped to a customer-facing message by the UI. */
export type WaafiFailure = 'rejected' | 'insufficient_funds' | 'timeout' | 'invalid_account' | 'error';

/**
 * Normalise a Somali mobile number to WaafiPay's `252XXXXXXXXX` form.
 * Accepts `61 234 5678`, `0612345678`, `+252612345678`, `00252…`. Returns null
 * for anything that is not a 9-digit Somali mobile number.
 */
export function normalizeSomaliMsisdn(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('252')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  if (!/^[679]\d{8}$/.test(d)) return null;
  return `252${d}`;
}

interface WaafiResponse {
  responseCode?: string;
  errorCode?: string;
  responseMsg?: string;
  params?: { state?: string; transactionId?: string } | null;
}

/** Classify a WaafiPay response. Success is responseCode 2001 + state APPROVED. */
export function interpretResponse(body: WaafiResponse): WaafiResult {
  const code = String(body.responseCode ?? '');
  const state = String(body.params?.state ?? '').toUpperCase();
  const msg = String(body.responseMsg ?? '');
  if (code === '2001' && state === 'APPROVED') {
    return { ok: true, transactionId: String(body.params?.transactionId ?? ''), raw: body };
  }
  const m = msg.toLowerCase();
  let reason: WaafiFailure = 'error';
  const state_ = state.toLowerCase();
  if (code === '5309' || m.includes('timeout') || m.includes('timed out') || m.includes('expired')) reason = 'timeout';
  else if (code === '5306' || m.includes('4004') || m.includes('abort') || m.includes('reject') || m.includes('cancel') || state_ === 'declined' || state_ === 'cancelled') reason = 'rejected';
  else if (m.includes('8001') || m.includes('insufficient') || m.includes('haraaga')) reason = 'insufficient_funds';
  else if (m.includes('account') && (m.includes('invalid') || m.includes('not found') || m.includes('not registered'))) reason = 'invalid_account';
  return { ok: false, reason, message: msg || `WaafiPay error ${code || 'unknown'}`, raw: body };
}

export async function waafiPurchase(
  cfg: WaafiConfig,
  input: { msisdn: string; amount: number; referenceId: string; invoiceId: string; description: string },
  timeoutMs = WAAFI_TIMEOUT_MS,
): Promise<WaafiResult> {
  const payload = {
    schemaVersion: '1.0',
    requestId: randomUUID(),
    timestamp: waafiTimestamp(),
    channelName: 'WEB',
    serviceName: 'API_PURCHASE',
    serviceParams: {
      merchantUid: cfg.merchantUid,
      apiUserId: cfg.apiUserId,
      apiKey: cfg.apiKey,
      paymentMethod: 'MWALLET_ACCOUNT',
      payerInfo: { accountNo: input.msisdn },
      transactionInfo: {
        referenceId: input.referenceId,
        invoiceId: input.invoiceId,
        amount: input.amount.toFixed(2),
        currency: 'USD',
        description: input.description.slice(0, 255),
      },
    },
  };

  try {
    const res = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = (await res.json().catch(() => ({}))) as WaafiResponse;
    const result = interpretResponse(body);
    if (!result.ok) {
      console.warn(`[waafipay] ${input.referenceId}: HTTP ${res.status} responseCode=${body.responseCode ?? '-'} errorCode=${body.errorCode ?? '-'} state=${body.params?.state ?? '-'} msg=${body.responseMsg ?? '-'}`);
    }
    return result;
  } catch (e) {
    const timedOut = (e as Error).name === 'TimeoutError' || (e as Error).name === 'AbortError';
    return {
      ok: false,
      reason: timedOut ? 'timeout' : 'error',
      message: timedOut ? 'No answer from the phone in time.' : `WaafiPay unreachable: ${(e as Error).message}`,
      raw: null,
    };
  }
}
