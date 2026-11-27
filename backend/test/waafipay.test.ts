import { afterEach, describe, expect, it, vi } from 'vitest';
import { interpretResponse, normalizeSomaliMsisdn, waafiPurchase, waafiTimestamp } from '../src/lib/waafipay.js';

describe('normalizeSomaliMsisdn', () => {
  it('accepts the common ways people type a Somali number', () => {
    for (const n of ['612345678', '0612345678', '+252 61 234 5678', '00252612345678', '252-61-234-5678']) {
      expect(normalizeSomaliMsisdn(n)).toBe('252612345678');
    }
    expect(normalizeSomaliMsisdn('63 444 5555')).toBe('252634445555');
    expect(normalizeSomaliMsisdn('90 777 8888')).toBe('252907778888');
  });

  it('rejects numbers that are not Somali mobiles', () => {
    for (const n of ['', '12345', '512345678', '61234567', '6123456789', 'abc']) {
      expect(normalizeSomaliMsisdn(n)).toBeNull();
    }
  });
});

describe('interpretResponse', () => {
  it('treats 2001 + APPROVED as paid', () => {
    expect(
      interpretResponse({ responseCode: '2001', responseMsg: 'RCS_SUCCESS', params: { state: 'APPROVED', transactionId: '123' } }),
    ).toMatchObject({ ok: true, transactionId: '123' });
  });

  it('maps a cancelled PIN prompt and a low balance', () => {
    expect(
      interpretResponse({ responseCode: '5206', responseMsg: 'RCS_TRAN_FAILED_AT_ISSUER_SYSTEM (STATE: rejected, ERRCODE: 4004 - User Aborted)' }),
    ).toMatchObject({ ok: false, reason: 'rejected' });
    expect(
      interpretResponse({ responseCode: '5206', responseMsg: 'RCS_TRAN_FAILED_AT_ISSUER_SYSTEM (STATE: declined, ERRCODE: 8001)' }),
    ).toMatchObject({ ok: false, reason: 'insufficient_funds' });
  });

  it('never treats 2001 without APPROVED as paid', () => {
    expect(interpretResponse({ responseCode: '2001', params: { state: 'PENDING' } }).ok).toBe(false);
  });
});

describe('waafiPurchase', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends an API_PURCHASE for the wallet and amount', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ responseCode: '2001', params: { state: 'APPROVED', transactionId: 'T1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await waafiPurchase(
      { merchantUid: 'M1', apiUserId: 'U1', apiKey: 'K1', apiUrl: 'https://sandbox.example/asm' },
      { msisdn: '252612345678', amount: 420, referenceId: 'pay_1', invoiceId: 'DLJ-1', description: 'test' },
    );
    expect(res).toMatchObject({ ok: true, transactionId: 'T1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://sandbox.example/asm');
    const body = JSON.parse(init.body);
    expect(body.serviceName).toBe('API_PURCHASE');
    expect(body.serviceParams).toMatchObject({
      merchantUid: 'M1',
      apiUserId: 'U1',
      apiKey: 'K1',
      paymentMethod: 'MWALLET_ACCOUNT',
      payerInfo: { accountNo: '252612345678' },
      transactionInfo: { referenceId: 'pay_1', invoiceId: 'DLJ-1', amount: '420.00', currency: 'USD' },
    });
  });

  it('reports a network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    const res = await waafiPurchase(
      { merchantUid: 'M', apiUserId: 'U', apiKey: 'K', apiUrl: 'https://x.example/asm' },
      { msisdn: '252612345678', amount: 1, referenceId: 'r', invoiceId: 'i', description: 'd' },
    );
    expect(res).toMatchObject({ ok: false, reason: 'error' });
  });
});

describe('docs alignment', () => {
  it('formats the timestamp as WaafiPay expects', () => {
    expect(waafiTimestamp(new Date('2026-11-28T09:04:44.741Z'))).toBe('2026-11-28 09:04:44');
  });

  it('treats 2001 without APPROVED as not paid', () => {
    expect(interpretResponse({ responseCode: '2001', params: { state: 'DECLINED' } })).toMatchObject({ ok: false, reason: 'rejected' });
  });

  it('maps the documented cancel and timeout codes', () => {
    expect(interpretResponse({ responseCode: '5306', responseMsg: 'RCS_HPP_USERACTION_CANCELLED' })).toMatchObject({ reason: 'rejected' });
    expect(interpretResponse({ responseCode: '5309', responseMsg: 'RCS_HPP_USERACTION_TIMEOUT' })).toMatchObject({ reason: 'timeout' });
  });
});
