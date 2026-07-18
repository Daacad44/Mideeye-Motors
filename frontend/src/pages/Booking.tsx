import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, MapPin, CalendarDays, ShieldCheck, Sparkles, ArrowRight, Smartphone, Zap, Clock } from 'lucide-react';
import { useVehicle } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { Logo } from '@/components/ui/Logo';
import { useCurrency, useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';
import { bookingsApi } from '@/lib/bookingsApi';
import { paymentsApi, type Payment } from '@/lib/paymentsApi';
import { couponsApi, type CouponValidation } from '@/lib/couponsApi';

const EXTRAS = [
  { id: 'driver', label: 'Professional driver', price: 40 },
  { id: 'childSeat', label: 'Child seat', price: 8 },
  { id: 'wifi', label: 'Portable Wi-Fi', price: 6 },
  { id: 'gps', label: 'GPS navigation', price: 5 },
];

const INSURANCE = [
  { id: 'basic', label: 'Basic cover', price: 0, desc: 'Included' },
  { id: 'premium', label: 'Premium cover', price: 18, desc: 'Zero excess' },
  { id: 'full', label: 'Full protection', price: 30, desc: 'Zero excess + tyres & glass' },
];

const TAX_RATE = 0.05;

export default function Booking() {
  const [params] = useSearchParams();
  const slug = params.get('vehicle') ?? 'toyota-land-cruiser-2024';
  const { vehicle } = useVehicle(slug);
  const { money, currency } = useCurrency();
  const { t } = useI18n();
  useSeo({ title: t('booking.title') });

  const [form, setForm] = useState({
    pickupLocation: 'Mogadishu HQ',
    dropoffLocation: 'Mogadishu HQ',
    pickupDate: '',
    returnDate: '',
    name: '',
    email: '',
    phone: '',
  });
  const [extras, setExtras] = useState<string[]>([]);
  const [insurance, setInsurance] = useState('basic');
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment step (after the booking is created).
  const [payment, setPayment] = useState<Payment | null>(null);
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Promo code (validated server-side; the discount is display-only here and is
  // re-computed authoritatively on the server at booking creation).
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Proactive availability heads-up as soon as both dates are chosen (reuses
  // the Wave 1 checkAvailability endpoint — the submit handler re-checks too).
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  useEffect(() => {
    const valid = !!form.pickupDate && !!form.returnDate && new Date(form.returnDate) > new Date(form.pickupDate);
    if (!vehicle || !valid) { setDateWarning(null); return; }
    let alive = true;
    bookingsApi
      .checkAvailability(vehicle.slug, form.pickupDate, form.returnDate)
      .then((r) => { if (alive) setDateWarning(r.data.available ? null : 'These dates are unavailable (already booked or under maintenance). Try different dates.'); })
      .catch(() => { if (alive) setDateWarning(null); });
    return () => { alive = false; };
  }, [vehicle?.slug, form.pickupDate, form.returnDate]);

  const days = useMemo(() => {
    if (!form.pickupDate || !form.returnDate) return 1;
    const d =
      (new Date(form.returnDate).getTime() - new Date(form.pickupDate).getTime()) /
      86400000;
    return Math.max(1, Math.round(d) || 1);
  }, [form.pickupDate, form.returnDate]);

  const rate = vehicle?.pricePerDay ?? 0;
  const carTotal = rate * days;
  const extrasPerDay = EXTRAS.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.price, 0);
  const insurancePerDay = INSURANCE.find((i) => i.id === insurance)?.price ?? 0;
  const extrasTotal = extrasPerDay * days;
  const insuranceTotal = insurancePerDay * days;
  const subtotal = carTotal + extrasTotal + insuranceTotal;
  const discount = coupon?.valid ? coupon.discount ?? 0 : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax = discountedSubtotal * TAX_RATE;
  const total = discountedSubtotal + tax;

  const toggleExtra = (id: string) =>
    setExtras((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const { data } = await couponsApi.validate({ code, days, subtotal: Math.round(subtotal) });
      if (data.valid) setCoupon(data);
      else { setCoupon(null); setCouponError(data.message ?? 'This promo code is invalid or expired.'); }
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
    if (!code) return;
    let alive = true;
    couponsApi
      .validate({ code, days, subtotal: Math.round(subtotal) })
      .then((r) => {
        if (!alive) return;
        if (r.data.valid) setCoupon(r.data);
        else { setCoupon(null); setCouponError('This promo code no longer applies to your booking.'); }
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, subtotal]);

  // Client validation gates the submit button; the server is the source of
  // truth for both availability and the final price.
  const datesValid =
    !!form.pickupDate && !!form.returnDate && new Date(form.returnDate) > new Date(form.pickupDate);
  const detailsValid = !!form.name.trim() && !!form.email.trim() && !!form.phone.trim();
  const canSubmit = datesValid && detailsValid && !!vehicle && !submitting;

  const handleSubmit = async () => {
    if (!vehicle || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Confirm the dates are still free before taking the booking.
      const { data: avail } = await bookingsApi.checkAvailability(
        vehicle.slug,
        form.pickupDate,
        form.returnDate,
      );
      if (!avail.available) {
        setError("This vehicle isn't available for those dates — try different dates.");
        return;
      }
      const { data: booking } = await bookingsApi.create({
        vehicleId: vehicle.id,
        pickupLocation: form.pickupLocation,
        dropoffLocation: form.dropoffLocation,
        pickupDate: form.pickupDate,
        returnDate: form.returnDate,
        extras,
        insurance,
        extrasPerDay,
        insurancePerDay,
        name: form.name,
        email: form.email,
        phone: form.phone,
        couponCode: coupon?.valid ? coupon.code : undefined,
      });
      setReference(booking.reference);
      setBookingId(booking.id);
      setConfirmed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const pay = async (provider: 'manual' | 'mock') => {
    if (!bookingId) return;
    if (provider === 'manual' && !payRef.trim()) {
      setPayError('Enter the transaction reference from your mobile-money payment.');
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const { data } = await paymentsApi.create({
        bookingId,
        provider,
        reference: provider === 'manual' ? payRef.trim() : undefined,
      });
      setPayment(data);
    } catch (e) {
      setPayError((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  const field = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none';
  const label = 'mb-1.5 block text-[13px] font-bold text-navy-700';

  return (
    <div className="bg-mist-100">
      <div className="mx-auto max-w-[1360px] px-5 py-12 lg:px-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-navy-700 lg:text-[40px]">
            {t('booking.title')}
          </h1>
          <p className="mt-3 text-[16px] text-ink-500">
            {t('booking.subtitle')}
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Form */}
          <div className="space-y-6">
            {confirmed ? (
              <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-[var(--shadow-soft)] sm:p-10">
                <div className="mb-6 flex justify-center"><Logo height={48} /></div>

                {payment?.status === 'PAID' ? (
                  <>
                    <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
                    <h3 className="mt-4 font-display text-2xl font-extrabold text-navy-700">Booking confirmed!</h3>
                    <p className="mx-auto mt-2 max-w-md text-ink-500">
                      Payment received in full — your {vehicle?.title} is confirmed. A confirmation has been sent to your email and phone.
                    </p>
                  </>
                ) : payment?.status === 'PENDING' ? (
                  <>
                    <Clock className="mx-auto size-16 text-amber-500" />
                    <h3 className="mt-4 font-display text-2xl font-extrabold text-navy-700">Payment received — pending verification</h3>
                    <p className="mx-auto mt-2 max-w-md text-ink-500">
                      Thanks! We’ll verify your transaction reference and confirm your {vehicle?.title} shortly. A confirmation has been sent to your email and phone.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
                    <h3 className="mt-4 font-display text-2xl font-extrabold text-navy-700">Booking received!</h3>
                    <p className="mx-auto mt-2 max-w-md text-ink-500">
                      We’ve reserved your {vehicle?.title}. A confirmation has been sent to{' '}
                      <span className="font-semibold text-navy-700">{form.email || 'your email'}</span> and your phone — complete payment below to confirm.
                    </p>
                  </>
                )}

                {reference && (
                  <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-line bg-mist-100 px-5 py-4">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-ink-400">Booking reference</div>
                    <div className="mt-1 font-display text-xl font-extrabold tracking-wide text-navy-700">{reference}</div>
                    <p className="mt-1 text-[12.5px] text-ink-400">Keep this reference to track your booking status anytime.</p>
                  </div>
                )}

                {!payment && bookingId && (
                  <div className="mx-auto mt-6 max-w-md rounded-2xl border border-line p-5 text-left">
                    <h4 className="flex items-center justify-between font-display text-[15px] font-bold text-navy-700">
                      <span>Complete payment</span>
                      <span className="text-brand-600">{money(total)}</span>
                    </h4>

                    {payError && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{payError}</div>
                    )}

                    <div className="mt-4 rounded-xl border border-line p-4">
                      <div className="flex items-center gap-2 text-[14px] font-bold text-navy-700">
                        <Smartphone className="size-4 text-brand-600" /> Mobile money (EVC Plus / Zaad)
                      </div>
                      <p className="mt-1 text-[12.5px] text-ink-400">Pay by mobile money, then enter the transaction reference from your confirmation SMS.</p>
                      <input
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="Transaction reference"
                        className="mt-3 w-full rounded-xl border border-line px-3 py-2.5 text-[14px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none"
                      />
                      <button
                        onClick={() => pay('manual')}
                        disabled={paying || !payRef.trim()}
                        className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-[14px] font-bold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {paying ? 'Submitting…' : 'I’ve paid — submit reference'}
                      </button>
                    </div>

                    <button
                      onClick={() => pay('mock')}
                      disabled={paying}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-100/50 px-4 py-3 text-[13.5px] font-bold text-brand-600 hover:bg-brand-100 disabled:opacity-60"
                    >
                      <Zap className="size-4" /> Pay now (test)
                    </button>
                  </div>
                )}

                <div>
                  <Link
                    to="/fleet"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white"
                  >
                    Browse more cars <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <Panel title={t('booking.rentalDetails')} icon={MapPin}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={label}>{t('booking.pickupLocation')}</label>
                      <input className={field} value={form.pickupLocation}
                        onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>{t('booking.dropoffLocation')}</label>
                      <input className={field} value={form.dropoffLocation}
                        onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>{t('booking.pickupDate')}</label>
                      <input type="date" className={field} value={form.pickupDate}
                        onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>{t('booking.returnDate')}</label>
                      <input type="date" className={field} value={form.returnDate}
                        onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
                    </div>
                  </div>
                  {dateWarning && (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-700">
                      {dateWarning}
                    </div>
                  )}
                </Panel>

                <Panel title={t('booking.extras')} icon={Sparkles}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EXTRAS.map((e) => (
                      <button key={e.id} onClick={() => toggleExtra(e.id)}
                        className={
                          'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ' +
                          (extras.includes(e.id) ? 'border-brand-500 bg-brand-100/60' : 'border-line bg-white hover:border-brand-300')
                        }>
                        <span className="text-[14.5px] font-semibold text-navy-700">{e.label}</span>
                        <span className="text-[13px] font-bold text-brand-600">+{money(e.price)}/day</span>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title={t('booking.insurance')} icon={ShieldCheck}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {INSURANCE.map((opt) => (
                      <button key={opt.id} onClick={() => setInsurance(opt.id)}
                        className={
                          'rounded-xl border px-4 py-4 text-left transition ' +
                          (insurance === opt.id ? 'border-brand-500 bg-brand-100/60' : 'border-line bg-white hover:border-brand-300')
                        }>
                        <div className="text-[14.5px] font-bold text-navy-700">{opt.label}</div>
                        <div className="text-[12.5px] text-ink-400">{opt.desc}</div>
                        <div className="mt-2 text-[13px] font-bold text-brand-600">
                          {opt.price ? `+${money(opt.price)}/day` : 'Free'}
                        </div>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title={t('booking.yourDetails')} icon={CalendarDays}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={label}>{t('booking.fullName')}</label>
                      <input className={field} value={form.name} placeholder="Jane Doe"
                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>{t('booking.email')}</label>
                      <input type="email" className={field} value={form.email} placeholder="jane@email.com"
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>{t('booking.phone')}</label>
                      <input className={field} value={form.phone} placeholder="+252 …"
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                </Panel>
              </>
            )}
          </div>

          {/* Summary */}
          <aside>
            <div className="sticky top-24 rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-lift)]">
              <h3 className="font-display text-lg font-bold text-navy-700">{t('booking.summary')}</h3>

              <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-b from-mist-200 to-white">
                <VehicleImage
                  filePath={vehicle?.coverImage?.filePath}
                  alt={vehicle?.coverImage?.alt || vehicle?.title || 'Vehicle'}
                  preset="card"
                  fit="contain"
                  className="aspect-[16/9] w-full"
                />
              </div>
              <h4 className="mt-3 font-display font-bold text-navy-700">{vehicle?.title}</h4>
              <p className="text-[13px] text-ink-400">{vehicle?.category} · {vehicle?.transmission}</p>

              <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[14px]">
                <Row label={t('booking.pickup')} value={form.pickupLocation} />
                <Row label={t('booking.ret')} value={form.dropoffLocation} />
                <Row label={t('booking.duration')} value={`${days} ${days > 1 ? t('booking.days') : t('booking.day')}`} />
                <Row label={`${t('common.from')} × ${days}`} value={money(carTotal)} />
                {extrasTotal > 0 && <Row label={t('booking.extras')} value={money(extrasTotal)} />}
                {insuranceTotal > 0 && <Row label={t('booking.insurance')} value={money(insuranceTotal)} />}
                {discount > 0 && <Row label={`${t('booking.discount')}${coupon?.code ? ` (${coupon.code})` : ''}`} value={`- ${money(discount)}`} />}
                <Row label={t('booking.tax')} value={money(tax)} />
              </dl>

              {!confirmed && (
                <div className="mt-4 border-t border-line pt-4">
                  {coupon?.valid ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                      <span className="text-[13px] font-bold text-emerald-700">Code {coupon.code} applied</span>
                      <button onClick={removeCoupon} className="text-[12px] font-bold text-ink-400 hover:text-red-500">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder={t('booking.promoPlaceholder')}
                        className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2.5 text-[13.5px] font-mono uppercase text-navy-700 focus:border-brand-400 focus:outline-none" />
                      <button onClick={applyCoupon} disabled={applyingCoupon || !couponInput.trim()}
                        className="rounded-xl bg-navy-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-navy-800 disabled:opacity-60">
                        {applyingCoupon ? '…' : t('common.apply')}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="mt-2 text-[12px] font-medium text-red-600">{couponError}</p>}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <span className="font-display font-bold text-navy-700">{t('booking.total')}</span>
                <span className="font-display text-2xl font-extrabold text-navy-700">
                  {money(total)}
                </span>
              </div>
              {currency === 'SOS' && (
                <p className="mt-1.5 text-right text-[11.5px] font-medium text-ink-400">{t('booking.sosNote')}</p>
              )}

              {!confirmed && (
                <>
                  {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-glow-amber)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {submitting ? 'Processing…' : <>{t('booking.confirmPay')} <ArrowRight className="size-4" /></>}
                  </button>
                  {!canSubmit && !submitting && (
                    <p className="mt-2 text-center text-[12px] text-ink-400">
                      {t('booking.fillPrompt')}
                    </p>
                  )}
                </>
              )}
              <p className="mt-3 text-center text-[12px] text-ink-400">
                {t('booking.noCharge')}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold text-navy-700">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-100 text-brand-600">
          <Icon className="size-[18px]" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right font-semibold text-navy-700">{value}</dd>
    </div>
  );
}
