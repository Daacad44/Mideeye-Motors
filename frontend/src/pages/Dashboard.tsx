import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Car, CreditCard, Heart, ArrowRight } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { formatCurrency } from '@/lib/cn';
import type { Vehicle } from '@/types/vehicle';

export default function Dashboard() {
  const { vehicles } = useVehicles();
  const [bookings, setBookings] = useState<{ v: Vehicle; id: string; from: string; to: string; status: string }[]>([]);

  useEffect(() => {
    if (!vehicles.length) return;
    const pick = (slug: string) => vehicles.find((x) => x.slug === slug) ?? vehicles[0];
    setBookings([
      { v: pick('toyota-land-cruiser-2024'), id: 'MM-10241', from: 'Jul 14', to: 'Jul 18', status: 'Upcoming' },
      { v: pick('tesla-model-3-2024'), id: 'MM-10233', from: 'Jun 02', to: 'Jun 05', status: 'Completed' },
      { v: pick('hyundai-santa-fe-2023'), id: 'MM-10219', from: 'May 21', to: 'May 24', status: 'Completed' },
    ]);
  }, [vehicles]);

  const stats = [
    { icon: CalendarDays, label: 'Active bookings', value: '1' },
    { icon: Car, label: 'Trips taken', value: '12' },
    { icon: Heart, label: 'Saved cars', value: '4' },
    { icon: CreditCard, label: 'Total spent', value: '$3,240' },
  ];

  return (
    <div className="min-h-screen bg-mist-100">
      <div className="mx-auto max-w-[1360px] px-5 py-10 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-brand-600 font-display text-xl font-bold text-white">JD</span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-700">Welcome back, Jane</h1>
            <p className="text-ink-400">Here’s what’s happening with your rentals.</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                          <VehicleImage publicId={b.v.thumbnail} alt={b.v.title} fit="contain" className="h-full w-full" sizes="64px" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-navy-700">{b.v.title}</div>
                          <div className="text-[12px] text-ink-400">{b.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-[14px] text-ink-500">{b.from} – {b.to}</td>
                    <td className="py-4">
                      <span className={'rounded-full px-2.5 py-1 text-[12px] font-bold ' + (b.status === 'Upcoming' ? 'bg-emerald-50 text-emerald-600' : 'bg-mist-200 text-ink-500')}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-bold text-navy-700">{formatCurrency(b.v.pricePerDay * 4)}</td>
                    <td className="py-4 text-right">
                      <Link to={`/fleet/${b.v.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline">
                        View <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
