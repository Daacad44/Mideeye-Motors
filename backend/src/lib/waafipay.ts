import { randomUUID } from 'node:crypto';

/**
 * WaafiPay mobile-wallet checkout (EVC Plus / Hormuud, ZAAD / Telesom,
 * SAHAL / Golis, WAAFI app).
 *
 * `API_PURCHASE` sends a push request to the customer's phone and the HTTP
 * call only returns once they approve with their PIN, reject, or time out — so
 * callers must run it in the background, never inside a web request.
 */

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
  if (m.includes('4004') || m.includes('abort') || m.includes('rejected')) reason = 'rejected';
  else if (m.includes('8001') || m.includes('insufficient') || m.includes('haraaga')) reason = 'insufficient_funds';
  else if (m.includes('timeout') || m.includes('timed out') || m.includes('expired')) reason = 'timeout';
  else if (m.includes('account') && (m.includes('invalid') || m.includes('not found') || m.includes('not registered'))) reason = 'invalid_account';
  return { ok: false, reason, message: msg || `WaafiPay error ${code || 'unknown'}`, raw: body };
}

export async function waafiPurchase(
  cfg: WaafiConfig,
  input: { msisdn: string; amount: number; referenceId: string; invoiceId: string; description: string },
  timeoutMs = 150_000,
): Promise<WaafiResult> {
  const payload = {
    schemaVersion: '1.0',
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
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
        description: input.description.slice(0, 100),
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
    return interpretResponse(body);
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
