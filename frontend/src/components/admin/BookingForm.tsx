import { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { bookingsApi, type Booking, type BookingStatus } from '@/lib/bookingsApi';
import { LOCATIONS } from '@/lib/locations';
import { formatCurrency } from '@/lib/cn';
import { useBranding } from '@/lib/branding';

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const EXTRA_LABELS: Record<string, string> = { driver: 'Driver', childSeat: 'Child seat', wifi: 'Wi-Fi', gps: 'GPS' };
const INSURANCE_LABELS: Record<string, string> = { basic: 'Basic', premium: 'Premium', full: 'Full protection' };

const field =
  'w-full rounded-xl border border-line bg-inset px-3.5 py-2.5 text-[15px] font-medium text-navy-700 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none';
const label = 'mb-1.5 block text-[12.5px] font-bold uppercase tracking-wide text-ink-400';
const day = (iso: string) => iso.slice(0, 10);

/**
 * Create or edit a booking from the admin. New bookings are for customers who
 * book by phone or at the desk: tick "Paid" when the money is already in.
 * The server prices everything; the total shown here is an estimate.
 */
export function BookingForm({ booking, onClose, onSaved }: { booking: Booking | null; onClose: () => void; onSaved: (b: Booking) => void }) {
  const { vehicles } = useVehicles();
  const { pricing } = useBranding();
  const editing = !!booking;
  const [form, setForm] = useState({
    vehicleId: booking?.vehicleId ?? '',
    name: booking?.customerName ?? '',
    phone: booking?.customerPhone ?? '',
    email: booking?.customerEmail ?? '',
    pickupLocation: booking?.pickupLocation ?? LOCATIONS[0].id,
    dropoffLocation: booking?.dropoffLocation ?? LOCATIONS[0].id,
    pickupDate: booking ? day(booking.pickupDate) : '',
    returnDate: booking ? day(booking.returnDate) : '',
    extras: booking?.extras ?? ([] as string[]),
    insurance: booking?.insurance ?? 'basic',
    status: (booking?.status ?? 'CONFIRMED') as BookingStatus,
  });
  const [paid, setPaid] = useState(true);
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const vehicle = vehicles.find((v) => v.id === form.vehicleId);
  const extrasCatalog = pricing?.extras ?? { driver: 40, childSeat: 8, wifi: 6, gps: 5 };
  const insuranceCatalog = pricing?.insurance ?? { basic: 0, premium: 18, full: 30 };
  const estimate = useMemo(() => {
    if (!vehicle || !form.pickupDate || !form.returnDate) return null;
    const days = Math.max(1, Math.round((new Date(form.returnDate).getTime() - new Date(form.pickupDate).getTime()) / 86400000));
    const perDay = vehicle.pricePerDay + form.extras.reduce((s, id) => s + (extrasCatalog[id] ?? 0), 0) + (insuranceCatalog[form.insurance] ?? 0);
    const sub = Math.round(perDay * days * 100) / 100;
    const tax = Math.round(sub * (pricing?.taxRate ?? 0.05) * 100) / 100;
    return { days, total: Math.round((sub + tax) * 100) / 100 };
  }, [vehicle, form, extrasCatalog, insuranceCatalog, pricing]);

  const valid =
    !!form.vehicleId && !!form.name.trim() && form.phone.replace(/\D/g, '').length >= 7 && /\S+@\S+\.\S+/.test(form.email) &&
    !!form.pickupDate && !!form.returnDate && form.returnDate > form.pickupDate;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const common = {
        vehicleId: form.vehicleId,
        pickupLocation: form.pickupLocation,
        dropoffLocation: form.dropoffLocation,
        pickupDate: form.pickupDate,
        returnDate: form.returnDate,
        extras: form.extras,
        insurance: form.insurance,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };
      const { data } = editing
        ? await bookingsApi.update(booking!.id, { ...common, status: form.status })
        : await bookingsApi.createByStaff({ ...common, paid, paymentReference: paymentReference.trim() || undefined });
      onSaved(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={editing ? 'Edit booking' : 'New booking'}>
      <button className="absolute inset-0 bg-black/60" aria-label="Close" onClick={onClose} />
      <form onSubmit={submit}
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[24px] border-t border-white/10 bg-surface sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[520px] sm:rounded-none sm:border-l sm:border-t-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-white">{editing ? 'Edit booking' : 'New booking'}</h2>
            {editing && <p className="font-mono text-[12px] text-ink-400">{booking!.reference}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-xl text-ink-400 hover:bg-white/8 hover:text-white"><X className="size-5" /></button>
        </div>

        <div className="grid gap-4 p-5">
          <div><label className={label} htmlFor="bf-car">Car</label>
            <select id="bf-car" className={field} value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
              <option value="">Choose a car…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.title} · {formatCurrency(v.pricePerDay)}/day</option>)}
            </select></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="bf-from">Pickup date</label>
              <input id="bf-from" type="date" className={field} value={form.pickupDate} onChange={(e) => set('pickupDate', e.target.value)} /></div>
            <div><label className={label} htmlFor="bf-to">Return date</label>
              <input id="bf-to" type="date" className={field} value={form.returnDate} min={form.pickupDate || undefined} onChange={(e) => set('returnDate', e.target.value)} /></div>
            <div><label className={label} htmlFor="bf-pl">Pickup location</label>
              <select id="bf-pl" className={field} value={form.pickupLocation} onChange={(e) => set('pickupLocation', e.target.value)}>
                {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.id}</option>)}
              </select></div>
            <div><label className={label} htmlFor="bf-dl">Return location</label>
              <select id="bf-dl" className={field} value={form.dropoffLocation} onChange={(e) => set('dropoffLocation', e.target.value)}>
                {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.id}</option>)}
              </select></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={label} htmlFor="bf-name">Customer name</label>
              <input id="bf-name" className={field} value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label className={label} htmlFor="bf-phone">Phone</label>
              <input id="bf-phone" type="tel" className={field} value={form.phone} placeholder="+252 6…" onChange={(e) => set('phone', e.target.value)} /></div>
            <div><label className={label} htmlFor="bf-email">Email</label>
              <input id="bf-email" type="email" className={field} value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          </div>

          <div>
            <span className={label}>Extras</span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(extrasCatalog).map((id) => {
                const on = form.extras.includes(id);
                return (
                  <button key={id} type="button" aria-pressed={on}
                    onClick={() => set('extras', on ? form.extras.filter((x) => x !== id) : [...form.extras, id])}
                    className={'rounded-xl border px-3 py-2 text-[13px] font-semibold ' + (on ? 'border-brand-400 bg-brand-600/12 text-white' : 'border-line text-ink-500')}>
                    {EXTRA_LABELS[id] ?? id} · {formatCurrency(extrasCatalog[id])}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label className={label} htmlFor="bf-ins">Insurance</label>
            <select id="bf-ins" className={field} value={form.insurance} onChange={(e) => set('insurance', e.target.value)}>
              {Object.keys(insuranceCatalog).map((id) => <option key={id} value={id}>{INSURANCE_LABELS[id] ?? id} · {formatCurrency(insuranceCatalog[id])}/day</option>)}
            </select></div>

          {editing ? (
            <div><label className={label} htmlFor="bf-status">Status</label>
              <select id="bf-status" className={field} value={form.status} onChange={(e) => set('status', e.target.value as BookingStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
          ) : (
            <div className="rounded-2xl border border-line bg-inset p-4">
              <label className="flex items-center gap-3 text-[14px] font-semibold text-white">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-brand-600" />
                Customer has paid (cash or mobile money)
              </label>
              <p className="mt-1 text-[12.5px] text-ink-400">Paid bookings are confirmed straight away. Unpaid ones stay PENDING until you record the payment.</p>
              {paid && (
                <input className={field + ' mt-3'} value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Payment reference (optional)" />
              )}
            </div>
          )}

          {estimate && (
            <div className="flex items-center justify-between rounded-2xl bg-white/[.04] px-4 py-3">
              <span className="text-[13px] text-ink-400">{estimate.days} day{estimate.days > 1 ? 's' : ''} · estimate incl. tax</span>
              <span className="font-display text-xl font-extrabold text-white">{formatCurrency(estimate.total)}</span>
            </div>
          )}
          {editing && <p className="text-[12.5px] text-ink-400">Changing the car, dates, extras or insurance re-prices the booking. Money already paid is not changed.</p>}
          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13.5px] text-red-400">{error}</div>}
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-line bg-surface px-5 py-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl border border-line font-bold text-white hover:bg-white/8">Cancel</button>
          <button type="submit" disabled={!valid || saving}
            className="inline-flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            {saving && <Loader2 className="size-4 animate-spin" />} {editing ? 'Save changes' : 'Create booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
