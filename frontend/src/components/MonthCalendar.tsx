import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BusyRange } from '@/lib/vehiclesApi';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Lightweight month grid (no calendar library). Days falling inside any busy
 * range are highlighted — bookings in brand blue, maintenance in amber.
 * Bookings win when a day is covered by both.
 */
export function MonthCalendar({ ranges, initialMonth }: { ranges: BusyRange[]; initialMonth?: Date }) {
  const [cursor, setCursor] = useState(() => {
    const base = initialMonth ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const dayType = useMemo(() => {
    const map = new Map<number, 'booking' | 'maintenance'>();
    for (const r of ranges) {
      const from = startOfDay(new Date(r.from));
      const to = startOfDay(new Date(r.to));
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) continue;
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = d.getTime();
        if (r.type === 'booking') map.set(key, 'booking');
        else if (!map.has(key)) map.set(key, 'maintenance');
      }
    }
    return map;
  }, [ranges]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date()).getTime();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="grid size-8 place-items-center rounded-lg border border-line text-navy-700 hover:border-brand-400 hover:text-brand-600" aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </button>
        <div className="font-display text-[15px] font-bold text-navy-700">{monthLabel}</div>
        <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="grid size-8 place-items-center rounded-lg border border-line text-navy-700 hover:border-brand-400 hover:text-brand-600" aria-label="Next month">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="pb-1 text-[11px] font-bold uppercase text-ink-400">{w}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const t = date.getTime();
          const type = dayType.get(t);
          const isToday = t === today;
          const style =
            type === 'booking'
              ? 'bg-brand-600 text-white'
              : type === 'maintenance'
                ? 'bg-amber-500 text-white'
                : 'text-navy-700' + (isToday ? ' ring-1 ring-brand-400' : '');
          return (
            <div key={t} className={'grid aspect-square place-items-center rounded-lg text-[12.5px] font-semibold ' + style}>
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[12px] text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-brand-600" /> Booked</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-amber-500" /> Maintenance</span>
      </div>
    </div>
  );
}
