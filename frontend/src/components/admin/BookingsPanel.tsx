import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock, Activity, DollarSign, BadgeCheck, Download } from 'lucide-react';
import { VehicleImage } from '@/components/VehicleImage';
import { bookingsApi, type Booking, type BookingStatus } from '@/lib/bookingsApi';
import { paymentsApi, type PaymentStatus } from '@/lib/paymentsApi';
import { reportsApi } from '@/lib/reportsApi';
import { formatCurrency } from '@/lib/cn';

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

/**
 * An online checkout that was never paid (rejected PIN, no balance, timeout).
 * The server cancels these holds automatically; they are not real bookings,
 * so they are hidden unless the admin asks to see them.
 */
const isUnpaidAttempt = (b: Booking) =>
  b.status === 'CANCELLED' && b.paymentStatus !== 'PAID' && !!b.payments?.some((p) => p.provider === 'waafipay');

const statusBadge: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300',
  CONFIRMED: 'bg-blue-500/15 text-blue-300',
  ACTIVE: 'bg-emerald-500/15 text-emerald-400',
  COMPLETED: 'bg-mist-200 text-ink-500',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

const payBadge: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300',
  PAID: 'bg-emerald-500/15 text-emerald-400',
  FAILED: 'bg-red-500/15 text-red-400',
  REFUNDED: 'bg-mist-200 text-ink-500',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

export function BookingsPanel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'' | BookingStatus>('');
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // KPIs always reflect the full set, so the table filters client-side.
  const load = () => {
    setLoading(true);
    return bookingsApi
      .listAll()
      .then((r) => setBookings(r.data))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: BookingStatus) => {
    const prev = bookings;
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      await bookingsApi.setStatus(id, status);
    } catch (e) {
      setError((e as Error).message);
      setBookings(prev); // roll back the optimistic change
    }
  };

  // Verify a manual payment → marks it PAID and confirms the booking; reload
  // so the derived payment/booking status refresh together.
  const verifyPayment = async (paymentId: string) => {
    setError(null);
    try {
      await paymentsApi.verify(paymentId, 'PAID');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const kpis = useMemo(
    () => [
      { icon: ClipboardList, label: 'Paid bookings', value: bookings.filter((b) => b.paymentStatus === 'PAID').length },
      { icon: Clock, label: 'Paying now', value: bookings.filter((b) => b.status === 'PENDING' && b.paymentStatus === 'PENDING').length },
      { icon: Activity, label: 'Active', value: bookings.filter((b) => b.status === 'ACTIVE').length },
      { icon: DollarSign, label: 'Revenue', value: formatCurrency(Math.round(bookings.reduce((s, b) => s + (b.amountPaid || 0), 0) * 100) / 100) },
    ],
    [bookings],
  );

  const unpaidCount = bookings.filter(isUnpaidAttempt).length;
  const rows = bookings.filter((b) => (showUnpaid || !isUnpaidAttempt(b)) && (!filter || b.status === filter));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:rounded-3xl sm:p-6">
            <k.icon className="size-6 text-brand-500" />
            <div className="mt-3 font-display text-2xl font-extrabold text-navy-700 sm:text-3xl">{k.value}</div>
            <div className="text-[13px] text-ink-400">{k.label}</div>
          </div>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13.5px] text-red-400">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <h3 className="font-display text-lg font-bold text-navy-700">All bookings</h3>
          <div className="flex flex-wrap items-center gap-2">
            {unpaidCount > 0 && (
              <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-500">
                <input type="checkbox" checked={showUnpaid} onChange={(e) => setShowUnpaid(e.target.checked)} className="accent-brand-600" />
                Show unpaid attempts ({unpaidCount})
              </label>
            )}
            <span className="text-[12px] font-bold uppercase tracking-wide text-ink-400">Status</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as '' | BookingStatus)}
              className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-navy-700 focus:border-brand-400 focus:outline-none"
            >
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => reportsApi.bookingsCsv({ from: '2000-01-01T00:00:00.000Z', status: filter || undefined }).catch((e) => setError((e as Error).message))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[13px] font-bold text-navy-700 hover:border-brand-400 hover:text-brand-600"
            >
              <Download className="size-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Phone: one card per booking */}
        <ul className="divide-y divide-line md:hidden">
          {rows.map((b) => {
            const last = b.payments?.[0];
            return (
              <li key={b.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-mist-200">
                    <VehicleImage filePath={b.vehicle?.thumbnail?.filePath} alt={b.vehicle?.title || 'Vehicle'} preset="thumb" fit="contain" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate font-bold text-navy-700">{b.customerName || b.user?.name || 'Guest'}</div>
                      <div className="shrink-0 font-display font-extrabold text-white">{formatCurrency(b.total)}</div>
                    </div>
                    <div className="truncate text-[12.5px] text-ink-400">{b.vehicle?.title ?? 'Vehicle'} · {fmtDate(b.pickupDate)} – {fmtDate(b.returnDate)}</div>
                    {b.customerPhone && <a href={`tel:${b.customerPhone}`} className="text-[12.5px] font-semibold text-ink-500">{b.customerPhone}</a>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={b.status}
                    onChange={(e) => setStatus(b.id, e.target.value as BookingStatus)}
                    aria-label="Booking status"
                    className={'rounded-lg px-2 py-1.5 text-[12px] font-bold focus:outline-none ' + statusBadge[b.status]}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className={'rounded-lg px-2 py-1.5 text-[12px] font-bold ' + (b.paymentStatus ? payBadge[b.paymentStatus] : 'bg-mist-200 text-ink-400')}>
                    {b.paymentStatus ?? 'UNPAID'}
                  </span>
                  {last && (
                    <span className="min-w-0 truncate text-[12px] text-ink-400">
                      {last.provider === 'waafipay' ? 'WaafiPay' : last.provider}
                      {last.payerPhone ? ` · +${last.payerPhone}` : ''}
                      {last.status === 'FAILED' && last.failureReason ? ` · ${last.failureReason.replace(/_/g, ' ')}` : ''}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 font-mono text-[11px] text-ink-400">{b.reference}</div>
              </li>
            );
          })}
          {!loading && rows.length === 0 && <li className="p-10 text-center text-ink-400">No bookings yet.</li>}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[12px] font-bold uppercase tracking-wide text-ink-400">
                <th className="p-4">Customer</th><th className="p-4">Vehicle</th><th className="p-4">Dates</th><th className="p-4">Status</th><th className="p-4">Payment</th><th className="p-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-line/70 last:border-0">
                  <td className="p-4">
                    <div className="font-bold text-navy-700">{b.customerName || b.user?.name || 'Guest'}</div>
                    <div className="text-[12px] text-ink-400">{b.customerEmail || b.user?.email || '—'}</div>
                    {b.customerPhone && <div className="text-[12px] text-ink-400">{b.customerPhone}</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-mist-200">
                        <VehicleImage filePath={b.vehicle?.thumbnail?.filePath} alt={b.vehicle?.thumbnail?.alt || b.vehicle?.title || 'Vehicle'} preset="thumb" fit="contain" className="h-full w-full" />
                      </div>
                      <div>
                        <div className="font-bold text-navy-700">{b.vehicle?.title ?? 'Vehicle'}</div>
                        <div className="text-[12px] text-ink-400">{b.reference}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-ink-500">{fmtDate(b.pickupDate)} – {fmtDate(b.returnDate)}</td>
                  <td className="p-4">
                    <select
                      value={b.status}
                      onChange={(e) => setStatus(b.id, e.target.value as BookingStatus)}
                      className={'rounded-lg px-2 py-1 text-[12px] font-bold focus:outline-none ' + statusBadge[b.status]}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    {(() => {
                      const pending = b.payments?.find((p) => p.status === 'PENDING' && p.provider === 'manual');
                      return (
                        <div className="space-y-1.5">
                          <span className={'inline-block rounded-lg px-2 py-1 text-[12px] font-bold ' + (b.paymentStatus ? payBadge[b.paymentStatus] : 'bg-mist-200 text-ink-400')}>
                            {b.paymentStatus ?? 'UNPAID'}
                          </span>
                          {b.payments?.[0] && (
                            <div className="text-[12px] text-ink-400">
                              {b.payments[0].provider === 'waafipay' ? 'WaafiPay' : b.payments[0].provider}
                              {b.payments[0].payerPhone ? ` · +${b.payments[0].payerPhone}` : ''}
                              {b.payments[0].status === 'PAID' && b.payments[0].reference ? ` · ${b.payments[0].reference}` : ''}
                              {b.payments[0].status === 'FAILED' && b.payments[0].failureReason ? ` · ${b.payments[0].failureReason.replace(/_/g, ' ')}` : ''}
                            </div>
                          )}
                          {pending && (
                            <button
                              onClick={() => verifyPayment(pending.id)}
                              title={pending.reference ? `Ref: ${pending.reference}` : undefined}
                              className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[12px] font-bold text-navy-700 hover:border-brand-400 hover:text-brand-600"
                            >
                              <BadgeCheck className="size-3.5" /> Verify payment
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-right font-bold text-navy-700">{formatCurrency(b.total)}</td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={6} className="py-12 text-center"><span className="inline-block size-7 animate-spin rounded-full border-2 border-line border-t-brand-600" /></td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-ink-400">No bookings{filter ? ` with status ${filter}` : ''} yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
