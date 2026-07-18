import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, MapPin, CalendarDays, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useVehicle } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { Logo } from '@/components/ui/Logo';
import { formatCurrency } from '@/lib/cn';
import { bookingsApi } from '@/lib/bookingsApi';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const toggleExtra = (id: string) =>
    setExtras((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

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
      });
      setReference(booking.reference);
      setConfirmed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none';
  const label = 'mb-1.5 block text-[13px] font-bold text-navy-700';

  return (
    <div className="bg-mist-100">
      <div className="mx-auto max-w-[1360px] px-5 py-12 lg:px-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-navy-700 lg:text-[40px]">
            Complete Your Booking
          </h1>
          <p className="mt-3 text-[16px] text-ink-500">
            A few quick details and you’re on the road.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Form */}
          <div className="space-y-6">
            {confirmed ? (
              <div className="rounded-3xl border border-line bg-white p-10 text-center shadow-[var(--shadow-soft)]">
                <div className="mb-6 flex justify-center"><Logo height={40} /></div>
                <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
                <h3 className="mt-4 font-display text-2xl font-extrabold text-navy-700">
                  Booking Confirmed!
                </h3>
                <p className="mx-auto mt-2 max-w-md text-ink-500">
                  We’ve reserved your {vehicle?.title}. A confirmation has been sent to{' '}
                  <span className="font-semibold text-navy-700">{form.email || 'your email'}</span>.
                </p>
                {reference && (
                  <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-line bg-mist-100 px-5 py-4">
                    <div className="text-[12px] font-bold uppercase tracking-wide text-ink-400">Booking reference</div>
                    <div className="mt-1 font-display text-xl font-extrabold tracking-wide text-navy-700">{reference}</div>
                    <p className="mt-1 text-[12.5px] text-ink-400">Keep this reference to track your booking status anytime.</p>
                  </div>
                )}
                <Link
                  to="/fleet"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white"
                >
                  Browse more cars <ArrowRight className="size-4" />
                </Link>
              </div>
            ) : (
              <>
                <Panel title="Rental details" icon={MapPin}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={label}>Pickup location</label>
                      <input className={field} value={form.pickupLocation}
                        onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>Drop-off location</label>
                      <input className={field} value={form.dropoffLocation}
                        onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>Pickup date</label>
                      <input type="date" className={field} value={form.pickupDate}
                        onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>Return date</label>
                      <input type="date" className={field} value={form.returnDate}
                        onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
                    </div>
                  </div>
                </Panel>

                <Panel title="Add extras" icon={Sparkles}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EXTRAS.map((e) => (
                      <button key={e.id} onClick={() => toggleExtra(e.id)}
                        className={
                          'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ' +
                          (extras.includes(e.id) ? 'border-brand-500 bg-brand-100/60' : 'border-line bg-white hover:border-brand-300')
                        }>
                        <span className="text-[14.5px] font-semibold text-navy-700">{e.label}</span>
                        <span className="text-[13px] font-bold text-brand-600">+{formatCurrency(e.price)}/day</span>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title="Insurance" icon={ShieldCheck}>
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
                          {opt.price ? `+${formatCurrency(opt.price)}/day` : 'Free'}
                        </div>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title="Your details" icon={CalendarDays}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={label}>Full name</label>
                      <input className={field} value={form.name} placeholder="Jane Doe"
                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>Email</label>
                      <input type="email" className={field} value={form.email} placeholder="jane@email.com"
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>Phone</label>
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
              <h3 className="font-display text-lg font-bold text-navy-700">Booking summary</h3>

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
                <Row label="Pickup" value={form.pickupLocation} />
                <Row label="Return" value={form.dropoffLocation} />
                <Row label="Duration" value={`${days} day${days > 1 ? 's' : ''}`} />
                <Row label={`Rate × ${days}`} value={formatCurrency(carTotal)} />
                {extrasTotal > 0 && <Row label="Extras" value={formatCurrency(extrasTotal)} />}
                {insuranceTotal > 0 && <Row label="Insurance" value={formatCurrency(insuranceTotal)} />}
                <Row label="Tax (5%)" value={formatCurrency(tax)} />
              </dl>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <span className="font-display font-bold text-navy-700">Total</span>
                <span className="font-display text-2xl font-extrabold text-navy-700">
                  {formatCurrency(total)}
                </span>
              </div>

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
                    {submitting ? 'Processing…' : <>Confirm & Pay <ArrowRight className="size-4" /></>}
                  </button>
                  {!canSubmit && !submitting && (
                    <p className="mt-2 text-center text-[12px] text-ink-400">
                      Add pickup &amp; return dates and your name, email &amp; phone to continue.
                    </p>
                  )}
                </>
              )}
              <p className="mt-3 text-center text-[12px] text-ink-400">
                No charge until pickup · Free cancellation 48h before.
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
