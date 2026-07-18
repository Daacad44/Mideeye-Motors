import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Car, CreditCard, ArrowRight, Lock } from 'lucide-react';
import { VehicleImage } from '@/components/VehicleImage';
import { ButtonLink } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { bookingsApi, type Booking, type BookingStatus } from '@/lib/bookingsApi';

const statusBadge: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-brand-100 text-brand-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-mist-200 text-ink-500',
  CANCELLED: 'bg-red-100 text-red-600',
};

const label: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    bookingsApi
      .listMine()
      .then((r) => active && setBookings(r.data))
      .catch((e) => active && setError((e as Error).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-mist-100">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-mist-100 px-5 text-center">
        <div className="max-w-md rounded-3xl border border-line bg-white p-10 shadow-[var(--shadow-soft)]">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600"><Lock className="size-7" /></span>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-navy-700">Sign in to see your bookings</h1>
          <p className="mt-2 text-ink-500">Your rentals, trip history and spending live here once you’re signed in.</p>
          <ButtonLink to="/login" variant="secondary" className="mt-6">Sign in</ButtonLink>
        </div>
      </div>
    );
  }

  const activeCount = bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'ACTIVE').length;
  const tripsTaken = bookings.filter((b) => b.status === 'COMPLETED').length;
  const totalSpent = bookings.filter((b) => b.status !== 'CANCELLED').reduce((s, b) => s + b.total, 0);

  const stats = [
    { icon: CalendarDays, label: 'Active bookings', value: String(activeCount) },
    { icon: Car, label: 'Trips taken', value: String(tripsTaken) },
    { icon: CreditCard, label: 'Total spent', value: formatCurrency(totalSpent) },
  ];

  return (
    <div className="min-h-screen bg-mist-100">
      <div className="mx-auto max-w-[1360px] px-5 py-10 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-brand-600 font-display text-xl font-bold text-white">{initials(user.name)}</span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-700">Welcome back, {user.name.split(/\s+/)[0]}</h1>
            <p className="text-ink-400">Here’s what’s happening with your rentals.</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
              <s.icon className="size-6 text-brand-500" />
              <div className="mt-4 font-display text-3xl font-extrabold text-navy-700">{s.value}</div>
              <div className="text-[13.5px] text-ink-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-navy-700">My bookings</h2>
            <Link to="/fleet" className="text-sm font-bold text-brand-600 hover:underline">Book another</Link>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-600">{error}</div>}

          {loading ? (
            <div className="grid place-items-center py-14">
              <span className="size-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-ink-500">You don’t have any bookings yet.</p>
              <Link to="/fleet" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline">
                Browse the fleet <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-line text-[12px] font-bold uppercase tracking-wide text-ink-400">
                    <th className="pb-3">Vehicle</th><th className="pb-3">Dates</th><th className="pb-3">Status</th><th className="pb-3 text-right">Total</th><th />
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-line/70 last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-mist-200">
                            <VehicleImage filePath={b.vehicle?.thumbnail?.filePath} alt={b.vehicle?.thumbnail?.alt || b.vehicle?.title || 'Vehicle'} preset="thumb" fit="contain" className="h-full w-full" />
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-navy-700">{b.vehicle?.title ?? 'Vehicle'}</div>
                            <div className="text-[12px] text-ink-400">{b.reference}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-[14px] text-ink-500">{fmtDate(b.pickupDate)} – {fmtDate(b.returnDate)}</td>
                      <td className="py-4">
                        <span className={'rounded-full px-2.5 py-1 text-[12px] font-bold ' + statusBadge[b.status]}>
                          {label[b.status]}
                        </span>
                      </td>
                      <td className="py-4 text-right font-bold text-navy-700">{formatCurrency(b.total)}</td>
                      <td className="py-4 text-right">
                        {b.vehicle?.slug && (
                          <Link to={`/fleet/${b.vehicle.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline">
                            {b.status === 'COMPLETED' ? 'Rate your trip' : 'View'} <ArrowRight className="size-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
