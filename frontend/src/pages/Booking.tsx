import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Loader2, Lock, Smartphone, XCircle, Zap } from 'lucide-react';
import { useVehicle } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { useCurrency, useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';
import { bookingsApi } from '@/lib/bookingsApi';
import { paymentsApi, type Payment, type PaymentProvider } from '@/lib/paymentsApi';
import { couponsApi, type CouponValidation } from '@/lib/couponsApi';
import { SPOTLIGHT_SLUG } from '@/lib/bundledPhotos';
import { LOCATIONS, locationKey } from '@/lib/locations';
import { cn } from '@/lib/cn';

// Display copy of the server price catalog (backend/src/lib/pricing.ts). The
// server recomputes every price, so keep these numbers in sync with it.
const EXTRAS = [
  { id: 'driver', price: 40 },
  { id: 'childSeat', price: 8 },
  { id: 'wifi', price: 6 },
  { id: 'gps', price: 5 },
];
const INSURANCE = [
  { id: 'basic', price: 0 },
  { id: 'premium', price: 18 },
  { id: 'full', price: 30 },
];
const TAX_RATE = 0.05;

/** WaafiPay wallets. The prefix only pre-fills the number field. */
const WALLETS = [
  { id: 'evc', label: 'EVC Plus', operator: 'Hormuud', prefix: '61' },
  { id: 'zaad', label: 'ZAAD', operator: 'Telesom', prefix: '63' },
  { id: 'sahal', label: 'SAHAL', operator: 'Golis', prefix: '90' },
  { id: 'waafi', label: 'WAAFI', operator: 'App', prefix: '' },
] as const;
type WalletId = (typeof WALLETS)[number]['id'];

const POLL_MS = 3000;
const POLL_LIMIT_MS = 4 * 60_000;

type PayState = 'idle' | 'waiting' | 'paid' | 'failed' | 'pending-review';

export default function Booking() {
  const [params] = useSearchParams();
  const slug = params.get('vehicle') ?? SPOTLIGHT_SLUG;
  const { vehicle } = useVehicle(slug);
  const { money, currency } = useCurrency();
  const { t } = useI18n();
  useSeo({ title: t('booking.title') });

  const today = new Date().toISOString().slice(0, 10);
  const startLocation = LOCATIONS.some((l) => l.id === params.get('pickup')) ? params.get('pickup')! : LOCATIONS[0].id;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    pickupLocation: startLocation,
    dropoffLocation: startLocation,
    pickupDate: params.get('pickupDate') ?? '',
    returnDate: params.get('returnDate') ?? '',
    name: '',
    email: '',
    phone: '',
  });
  const [extras, setExtras] = useState<string[]>([]);
  const [insurance, setInsurance] = useState('basic');

  // Booking (created on the first payment attempt) and payment.
  const [booking, setBooking] = useState<{ id: string; reference: string; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payState, setPayState] = useState<PayState>('idle');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [wallet, setWallet] = useState<WalletId>('evc');
  const [walletNumber, setWalletNumber] = useState('61');
  const [manualRef, setManualRef] = useState('');
  const pollRef = useRef<number | null>(null);

  // Only offer the payment methods the server accepts.
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  useEffect(() => {
    paymentsApi
      .providers()
      .then(({ data }) => setProviders(data))
      .catch(() => setProviders(['manual']));
  }, []);
  const waafiOn = providers.includes('waafipay');

  // Promo code (validated server-side; the discount is display-only here).
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const datesValid = !!form.pickupDate && !!form.returnDate && new Date(form.returnDate) > new Date(form.pickupDate);
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!vehicle || !datesValid) { setAvailable(null); return; }
    let alive = true;
    bookingsApi
      .checkAvailability(vehicle.slug, form.pickupDate, form.returnDate)
      .then((r) => { if (alive) setAvailable(r.data.available); })
      .catch(() => { if (alive) setAvailable(null); });
    return () => { alive = false; };
  }, [vehicle, form.pickupDate, form.returnDate, datesValid]);

  const days = useMemo(() => {
    if (!datesValid) return 1;
    const d = (new Date(form.returnDate).getTime() - new Date(form.pickupDate).getTime()) / 86400000;
    return Math.max(1, Math.round(d) || 1);
  }, [form.pickupDate, form.returnDate, datesValid]);

  const rate = vehicle?.pricePerDay ?? 0;
  const carTotal = rate * days;
  const extrasPerDay = EXTRAS.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.price, 0);
  const insurancePerDay = INSURANCE.find((i) => i.id === insurance)?.price ?? 0;
  const extrasTotal = extrasPerDay * days;
  const insuranceTotal = insurancePerDay * days;
  const subtotal = carTotal + extrasTotal + insuranceTotal;
  const discount = coupon?.valid ? coupon.discount ?? 0 : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax = Math.round(discountedSubtotal * TAX_RATE);
  // Once the booking exists, its server-computed total is the one charged.
  const total = booking?.total ?? discountedSubtotal + tax;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const { data } = await couponsApi.validate({ code, days, subtotal: Math.round(subtotal) });
      if (data.valid) setCoupon(data);
      else { setCoupon(null); setCouponError(data.message ?? t('booking.promoInvalid')); }
    } catch (e) {
      setCouponError((e as Error).message);
    } finally {
      setApplyingCoupon(false);
    }
  };
  const removeCoupon = () => { setCoupon(null); setCouponInput(''); setCouponError(null); };

  // Re-validate an applied coupon when the duration or cart total changes.
  useEffect(() => {
    const code = coupon?.code;
    if (!code || booking) return;
    let alive = true;
    couponsApi
      .validate({ code, days, subtotal: Math.round(subtotal) })
      .then((r) => {
        if (!alive) return;
        if (r.data.valid) setCoupon(r.data);
        else { setCoupon(null); setCouponError(t('booking.promoNoLonger')); }
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, subtotal]);

  useEffect(() => () => { if (pollRef.current) window.clearTimeout(pollRef.current); }, []);
  // Keep the payment status in view (it replaces the form, which may be scrolled past on phones).
  useEffect(() => { if (payState !== 'idle') window.scrollTo({ top: 0, behavior: 'smooth' }); }, [payState]);

  const step1Valid = datesValid && available !== false;
  const detailsValid = !!form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.replace(/\D/g, '').length >= 7;
  const walletDigits = walletNumber.replace(/\D/g, '');
  const walletValid = /^[679]\d{8}$/.test(walletDigits.replace(/^0/, ''));

  /** Create the booking once; later payment attempts reuse it. */
  const ensureBooking = async () => {
    if (booking) return booking;
    if (!vehicle) throw new Error(t('booking.noVehicle'));
    const { data: avail } = await bookingsApi.checkAvailability(vehicle.slug, form.pickupDate, form.returnDate);
    if (!avail.available) throw new Error(t('vehicle.datesTaken'));
    const { data } = await bookingsApi.create({
      vehicleId: vehicle.id,
      pickupLocation: form.pickupLocation,
      dropoffLocation: form.dropoffLocation,
      pickupDate: form.pickupDate,
      returnDate: form.returnDate,
      extras,
      insurance,
      extrasPerDay,
      insurancePerDay,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      couponCode: coupon?.valid ? coupon.code : undefined,
    });
    const b = { id: data.id, reference: data.reference, total: data.total };
    setBooking(b);
    return b;
  };

  const poll = (b: { id: string; reference: string }, paymentId: string, startedAt: number) => {
    pollRef.current = window.setTimeout(async () => {
      try {
        const { data } = await paymentsApi.getForBooking(b.id, b.reference);
        const p = data.find((x) => x.id === paymentId);
        if (p && p.status !== 'PENDING') {
          setPayment(p);
          setPayState(p.status === 'PAID' ? 'paid' : 'failed');
          return;
        }
      } catch {
        /* keep polling through brief network errors */
      }
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        setPayState('failed');
        setPayment((p) => (p ? { ...p, failureReason: 'timeout' } : p));
        return;
      }
      poll(b, paymentId, startedAt);
    }, POLL_MS);
  };

  const pay = async (provider: PaymentProvider) => {
    setError(null);
    setSubmitting(true);
    try {
      const b = await ensureBooking();
      const { data } = await paymentsApi.create({
        bookingId: b.id,
        bookingReference: b.reference,
        provider,
        payerPhone: provider === 'waafipay' ? walletDigits : undefined,
        reference: provider === 'manual' ? manualRef.trim() : undefined,
      });
      setPayment(data);
      if (data.status === 'PAID') setPayState('paid');
      else if (provider === 'waafipay') {
        setPayState('waiting');
        poll(b, data.id, Date.now());
      } else setPayState('pending-review');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step < 3) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    void pay(waafiOn ? 'waafipay' : 'manual');
  };

  const canNext =
    step === 1 ? step1Valid
      : step === 2 ? true
        : detailsValid && !!vehicle && !submitting && (waafiOn ? walletValid : manualRef.trim().length >= 4);

  const pickWallet = (id: WalletId) => {
    setWallet(id);
    const w = WALLETS.find((x) => x.id === id)!;
    if (!walletDigits || WALLETS.some((x) => x.prefix === walletDigits)) setWalletNumber(w.prefix);
  };
  const walletLabel = WALLETS.find((w) => w.id === wallet)!.label;
  const locked = booking !== null; // dates / extras can't change after the booking exists
  const done = payState === 'paid' || payState === 'pending-review';

  const field = 'w-full rounded-xl border border-white/12 bg-inset p-3.5 text-base font-medium text-white placeholder:text-ink-400 focus:border-brand-400 focus:outline-none disabled:opacity-60';
  const label = 'flex flex-col gap-2 text-sm font-semibold text-ink-700';
  const req = <span className="text-brand-400" aria-hidden>*</span>;
  const opt = (on: boolean) =>
    cn('rounded-[14px] border text-left transition-colors', on ? 'border-brand-600 bg-brand-600/10' : 'border-white/12 bg-inset hover:border-brand-600/60');

  const steps = [t('booking.stepDetails'), t('booking.stepExtras'), t('booking.stepPay')];

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="poster text-[34px] text-white sm:text-[44px]">{t('booking.title')}</h1>
        <span className="inline-flex items-center gap-2 text-sm text-ink-500">
          <Lock className="size-4 text-emerald-400" aria-hidden /> {t('booking.secure')}
        </span>
      </div>

      {/* Stepper */}
      <ol aria-label={t('booking.steps')} className="m-0 mt-6 grid list-none grid-cols-3 gap-2.5 p-0">
        {steps.map((s, i) => {
          const n = i + 1;
          const reached = n <= step;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={locked || done || n > step}
                onClick={() => setStep(n)}
                aria-current={n === step ? 'step' : undefined}
                className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
              >
                <span className={cn('h-1 rounded-full', reached ? 'bg-brand-600' : 'bg-white/12')} />
                <span className="flex items-center gap-2.5">
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold', reached ? 'bg-brand-600 text-white' : 'bg-elevated text-ink-400')}>
                    {n < step ? <Check className="size-4" aria-hidden /> : n}
                  </span>
                  <span className={cn('text-sm font-semibold', n === step ? 'text-white' : 'text-ink-400')}>{s}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap items-start gap-7">
        <div className="min-w-0 flex-[999_1_560px] rounded-[22px] border border-white/8 bg-surface p-5 sm:p-7">
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold">{t('booking.rentalDetails')}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  <span>{t('booking.pickupLocation')} {req}</span>
                  <select className={field} value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}>
                    {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{t(l.key)}</option>)}
                  </select>
                </label>
                <label className={label}>
                  <span>{t('booking.dropoffLocation')} {req}</span>
                  <select className={field} value={form.dropoffLocation} onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })}>
                    {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{t(l.key)}</option>)}
                  </select>
                </label>
                <label className={label}>
                  <span>{t('booking.pickupDate')} {req}</span>
                  <input type="date" min={today} className={field} value={form.pickupDate} onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} />
                </label>
                <label className={label}>
                  <span>{t('booking.returnDate')} {req}</span>
                  <input type="date" min={form.pickupDate || today} className={field} value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
                </label>
              </div>
              {datesValid && available !== null && (
                <div
                  role="status"
                  className={cn(
                    'mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold',
                    available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300',
                  )}
                >
                  {available ? <Check className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
                  {available ? t('booking.availableDays', { days }) : t('vehicle.datesTaken')}
                </div>
              )}
              {form.pickupDate && form.returnDate && !datesValid && (
                <p className="mt-3 text-sm font-medium text-amber-300">{t('booking.returnAfterPickup')}</p>
              )}
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold">{t('booking.extras')}</h2>
              <p className="mt-1.5 text-ink-500">{t('booking.extrasHint')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {EXTRAS.map((e) => {
                  const on = extras.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setExtras((p) => (on ? p.filter((x) => x !== e.id) : [...p, e.id]))}
                      className={cn(opt(on), 'flex min-h-14 items-center justify-between gap-3 px-4')}
                    >
                      <span className="flex items-center gap-2.5 font-semibold text-white">
                        <span className={cn('grid size-5 place-items-center rounded-md border', on ? 'border-brand-600 bg-brand-600' : 'border-white/25')}>
                          {on && <Check className="size-3.5 text-white" aria-hidden />}
                        </span>
                        {t(`booking.extra_${e.id}`)}
                      </span>
                      <span className="font-display font-bold text-white">+{money(e.price)}</span>
                    </button>
                  );
                })}
              </div>
              <h3 className="mt-8 text-lg font-bold">{t('booking.insurance')}</h3>
              <div role="radiogroup" aria-label={t('booking.insurance')} className="mt-3 grid gap-3 sm:grid-cols-3">
                {INSURANCE.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    role="radio"
                    aria-checked={insurance === i.id}
                    onClick={() => setInsurance(i.id)}
                    className={cn(opt(insurance === i.id), 'p-4')}
                  >
                    <div className="font-bold text-white">{t(`booking.ins_${i.id}`)}</div>
                    <div className="text-[13px] text-ink-400">{t(`booking.ins_${i.id}Desc`)}</div>
                    <div className="mt-2 font-display font-bold text-white">
                      {i.price ? `+${money(i.price)} ${t('common.perDay')}` : t('booking.free')}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 3 — details + payment */}
          {step === 3 && payState === 'idle' && (
            <>
              <h2 className="text-2xl font-bold">{t('booking.detailsAndPay')}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  <span>{t('booking.fullName')} {req}</span>
                  <input className={field} autoComplete="name" disabled={locked} value={form.name} placeholder={t('booking.namePlaceholder')}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className={label}>
                  <span>{t('booking.phone')} {req}</span>
                  <input type="tel" className={field} autoComplete="tel" disabled={locked} value={form.phone} placeholder="+252 6…"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
                <label className={cn(label, 'sm:col-span-2')}>
                  <span>{t('booking.email')} {req}</span>
                  <input type="email" className={field} autoComplete="email" disabled={locked} value={form.email} placeholder="magac@email.com"
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <span className="text-[13px] font-normal text-ink-400">{t('booking.emailHint')}</span>
                </label>
              </div>

              {waafiOn ? (
                <>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">{t('booking.payWithWaafi')}</h3>
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-400">
                      <Lock className="size-3.5 text-emerald-400" aria-hidden /> {t('booking.waafiSecure')}
                    </span>
                  </div>
                  <div role="radiogroup" aria-label={t('booking.wallet')} className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {WALLETS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        role="radio"
                        aria-checked={wallet === w.id}
                        onClick={() => pickWallet(w.id)}
                        className={cn(opt(wallet === w.id), 'flex min-h-16 flex-col justify-center px-3.5 py-2.5')}
                      >
                        <span className="font-display font-bold text-white">{w.label}</span>
                        <span className="text-xs text-ink-400">{w.operator === 'App' ? t('booking.waafiApp') : w.operator}</span>
                      </button>
                    ))}
                  </div>
                  <label className={cn(label, 'mt-4')}>
                    <span>{t('booking.walletNumber', { wallet: walletLabel })} {req}</span>
                    <span className="flex items-stretch overflow-hidden rounded-xl border border-white/12 bg-inset focus-within:border-brand-400">
                      <span className="grid place-items-center border-r border-white/10 px-3.5 font-semibold text-ink-500">+252</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={walletNumber}
                        onChange={(e) => setWalletNumber(e.target.value.replace(/[^\d ]/g, ''))}
                        placeholder="61 234 5678"
                        className="min-w-0 flex-1 bg-transparent p-3.5 text-base font-semibold tracking-wide text-white focus:outline-none"
                      />
                    </span>
                    <span className="text-[13px] font-normal text-ink-400">{t('booking.walletHint')}</span>
                  </label>
                </>
              ) : (
                <div className="mt-8 rounded-[14px] border border-white/10 bg-inset p-4">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Smartphone className="size-4 text-brand-400" aria-hidden /> {t('booking.manualTitle')}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-400">{t('booking.manualHint')}</p>
                  <input value={manualRef} onChange={(e) => setManualRef(e.target.value)} placeholder={t('booking.manualPlaceholder')} className={cn(field, 'mt-3')} />
                </div>
              )}

              {providers.includes('mock') && (
                <button
                  type="button"
                  onClick={() => pay('mock')}
                  disabled={submitting || !detailsValid}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-sm font-semibold text-ink-500 hover:text-white disabled:opacity-50"
                >
                  <Zap className="size-4" aria-hidden /> {t('booking.testPay')}
                </button>
              )}
            </>
          )}

          {/* Waiting for the PIN */}
          {payState === 'waiting' && (
            <div role="status" aria-live="polite" className="py-6 text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-600/12">
                <Smartphone className="size-9 animate-pulse text-brand-400 motion-reduce:animate-none" aria-hidden />
              </div>
              <h2 className="mt-5 text-[28px] font-extrabold">{t('booking.checkPhone')}</h2>
              <p className="mx-auto mt-2 max-w-md text-ink-500">
                {t('booking.pushSent', { amount: money(total), wallet: walletLabel, number: `+252 ${walletDigits}` })}
              </p>
              <ol className="mx-auto mt-6 flex max-w-xs list-none flex-col gap-2.5 p-0 text-left text-[15px]">
                <li className="flex items-center gap-2.5 text-emerald-400"><Check className="size-4" aria-hidden /> {t('booking.stepSaved')}</li>
                <li className="flex items-center gap-2.5 text-emerald-400"><Check className="size-4" aria-hidden /> {t('booking.stepSent')}</li>
                <li className="flex items-center gap-2.5 text-white"><Loader2 className="size-4 animate-spin text-brand-400" aria-hidden /> {t('booking.stepWaiting')}</li>
              </ol>
            </div>
          )}

          {/* Payment failed: retry with the same booking */}
          {payState === 'failed' && (
            <div role="alert" className="py-6 text-center">
              <XCircle className="mx-auto size-16 text-red-400" aria-hidden />
              <h2 className="mt-4 text-[26px] font-extrabold">{t('booking.payFailed')}</h2>
              <p className="mx-auto mt-2 max-w-md text-ink-500">{t(`booking.fail_${payment?.failureReason ?? 'error'}`)}</p>
              <button
                type="button"
                onClick={() => setPayState('idle')}
                className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-brand-600 px-6 font-bold text-white hover:bg-brand-hover"
              >
                {t('booking.tryAgain')}
              </button>
            </div>
          )}

          {/* Done */}
          {done && booking && (
            <div role="status" className="py-4 text-center">
              {payState === 'paid' ? (
                <CheckCircle2 className="mx-auto size-16 text-emerald-400" aria-hidden />
              ) : (
                <Clock className="mx-auto size-16 text-amber-400" aria-hidden />
              )}
              <h2 className="mt-4 text-[28px] font-extrabold">
                {payState === 'paid' ? t('booking.confirmedTitle') : t('booking.reviewTitle')}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-ink-500">
                {payState === 'paid' ? t('booking.confirmedSub') : t('booking.reviewSub')}
              </p>
              <dl className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border border-white/8 text-left">
                <Row label={t('booking.reference')} value={booking.reference} mono />
                {payment?.reference && payment.provider === 'waafipay' && (
                  <Row label={t('booking.transaction')} value={payment.reference} mono />
                )}
                <Row label={t('booking.paid')} value={`${money(payment?.amount ?? total)}${payment?.provider === 'waafipay' ? ` · ${walletLabel}` : ''}`} />
              </dl>
              <p className="mt-3 text-[13px] text-ink-400">{t('booking.keepReference')}</p>
              <Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-[14px] bg-brand-600 px-6 font-bold text-white hover:bg-brand-hover">
                {t('common.backHome')}
              </Link>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">{error}</div>
          )}

          {payState === 'idle' && (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/8 pt-6">
              <button
                type="button"
                onClick={() => setStep(Math.max(1, step - 1))}
                className={cn('inline-flex min-h-12 items-center gap-2 rounded-[14px] border border-white/14 px-5 font-semibold text-white hover:bg-white/8', (step === 1 || locked) && 'invisible')}
              >
                <ArrowLeft className="size-4" aria-hidden /> {t('booking.back')}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-[14px] bg-brand-600 px-6 font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="size-4 animate-spin" aria-hidden /> {t('booking.processing')}</>
                ) : step < 3 ? (
                  <>{t('booking.next')} <ArrowRight className="size-4" aria-hidden /></>
                ) : waafiOn ? (
                  t('booking.payNow', { amount: money(total) })
                ) : (
                  t('booking.submitRef')
                )}
              </button>
            </div>
          )}
          {payState === 'idle' && step === 3 && !canNext && !submitting && (
            <p className="mt-3 text-right text-[13px] text-ink-400">{t('booking.fillPrompt')}</p>
          )}
        </div>

        {/* Summary */}
        <aside aria-label={t('booking.summary')} className="w-full flex-[1_1_320px] lg:sticky lg:top-24 lg:max-w-[380px]">
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-surface">
            <div className="bg-[radial-gradient(240px_110px_at_50%_80%,rgba(229,20,43,.18),transparent_70%),#11161d] px-5 pb-2 pt-6">
              <VehicleImage
                filePath={(vehicle?.coverImage ?? vehicle?.thumbnail)?.filePath}
                alt={vehicle?.title ?? ''}
                preset="card"
                fit="contain"
                className="aspect-[1792/592] w-full"
                imgClassName="mix-blend-lighten"
              />
            </div>
            <div className="p-5">
              <div className="font-display text-xl font-bold text-white">{vehicle?.title ?? '…'}</div>
              <div className="text-[13px] text-ink-400">
                {t(locationKey(form.pickupLocation) ?? form.pickupLocation)}
                {datesValid && ` · ${days} ${days > 1 ? t('booking.days') : t('booking.day')}`}
              </div>
              <dl className="m-0 mt-4 flex flex-col gap-2.5 border-t border-white/8 pt-4 text-[15px]">
                <SumRow label={`${t('booking.car')} (${money(rate)} × ${days})`} value={money(carTotal)} />
                {extrasTotal > 0 && <SumRow label={t('booking.extras')} value={money(extrasTotal)} />}
                {insuranceTotal > 0 && <SumRow label={t('booking.insurance')} value={money(insuranceTotal)} />}
                {discount > 0 && <SumRow label={`${t('booking.discount')}${coupon?.code ? ` (${coupon.code})` : ''}`} value={`− ${money(discount)}`} />}
                <SumRow label={t('booking.tax')} value={money(booking ? Math.max(0, booking.total - discountedSubtotal) : tax)} />
              </dl>

              {!locked && (
                <div className="mt-4 border-t border-white/8 pt-4">
                  {coupon?.valid ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5">
                      <span className="text-[13px] font-bold text-emerald-400">{t('booking.promoApplied', { code: coupon.code ?? '' })}</span>
                      <button type="button" onClick={removeCoupon} className="text-[13px] font-semibold text-ink-400 hover:text-white">{t('common.remove')}</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={t('booking.promoPlaceholder')}
                        aria-label={t('booking.promoPlaceholder')}
                        className="min-w-0 flex-1 rounded-xl border border-white/12 bg-inset px-3 py-2.5 font-mono text-sm uppercase text-white placeholder:normal-case placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={applyingCoupon || !couponInput.trim()}
                        className="min-h-11 rounded-xl border border-white/14 px-4 text-sm font-bold text-white hover:bg-white/8 disabled:opacity-50"
                      >
                        {applyingCoupon ? '…' : t('common.apply')}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="mt-2 text-[13px] font-medium text-red-400">{couponError}</p>}
                </div>
              )}

              <div className="mt-4 flex items-baseline justify-between border-t border-white/8 pt-4">
                <span className="font-bold text-white">{t('booking.total')}</span>
                <span className="font-display text-[28px] font-extrabold text-white">{money(total)}</span>
              </div>
              {currency === 'SOS' && <p className="mt-1 text-right text-xs text-ink-400">{t('booking.sosNote')}</p>}
              <p className="mt-3 text-center text-[13px] text-ink-400">{t('booking.noCharge')}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className="m-0 text-right font-semibold text-white">{value}</dd>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/6 bg-inset px-4 py-3 last:border-0">
      <dt className="text-ink-400">{label}</dt>
      <dd className={cn('m-0 text-right font-semibold text-white', mono && 'font-mono tracking-wide')}>{value}</dd>
    </div>
  );
}
