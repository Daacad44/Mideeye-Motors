import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarDays, Car, Search } from 'lucide-react';

const fields = [
  { key: 'pickup', label: 'Pickup Location', placeholder: 'Mogadishu HQ', icon: MapPin },
  { key: 'dropoff', label: 'Drop-off Location', placeholder: 'Same location', icon: MapPin },
  { key: 'pickupDate', label: 'Pickup Date', placeholder: '', icon: CalendarDays, type: 'date' },
  { key: 'returnDate', label: 'Return Date', placeholder: '', icon: CalendarDays, type: 'date' },
  { key: 'type', label: 'Car Type', placeholder: 'All types', icon: Car },
] as const;

export function SearchCard() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(values).filter(([, v]) => v)),
    );
    navigate(`/fleet?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className="glass grid grid-cols-1 gap-3 rounded-[20px] p-4 shadow-[0_30px_70px_rgba(4,15,30,.4)] sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto]"
    >
      {fields.map((f) => {
        const Icon = f.icon;
        return (
          <label
            key={f.key}
            className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 px-3.5 py-3 transition-colors focus-within:border-brand-400"
          >
            <Icon className="size-4 shrink-0 text-brand-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-brand-100/70">
                {f.label}
              </span>
              <input
                type={'type' in f ? f.type : 'text'}
                placeholder={f.placeholder}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-brand-100/50 focus:outline-none [color-scheme:dark]"
              />
            </span>
          </label>
        );
      })}
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-[var(--shadow-glow-amber)] transition-transform hover:-translate-y-0.5"
      >
        <Search className="size-[18px]" />
        <span className="lg:hidden xl:inline">Search</span>
      </button>
    </form>
  );
}
