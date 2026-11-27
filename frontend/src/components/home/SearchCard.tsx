import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useI18n } from '@/context/LocaleContext';
import { LOCATIONS } from '@/lib/locations';
import { CATEGORIES } from '@/lib/categories';

const today = () => new Date().toISOString().slice(0, 10);

/** Home search: where + when + what → the fleet page, carrying the trip along. */
export function SearchCard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [pickup, setPickup] = useState<string>(LOCATIONS[0].id);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [type, setType] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('pickup', pickup);
    if (pickupDate) params.set('pickupDate', pickupDate);
    if (returnDate) params.set('returnDate', returnDate);
    if (type) params.set('type', type);
    navigate(`/fleet?${params.toString()}`);
  };

  const cell = 'flex min-w-0 flex-col gap-1.5 rounded-[14px] bg-inset px-4 py-2.5 focus-within:ring-2 focus-within:ring-brand-400';
  const lab = 'text-xs font-semibold uppercase tracking-[0.05em] text-ink-400';
  const ctl = 'w-full min-w-0 bg-transparent p-0 text-base font-semibold text-white focus:outline-none';

  return (
    <form
      onSubmit={submit}
      aria-label={t('home.searchLabel')}
      className="grid grid-cols-1 gap-3 rounded-[22px] border border-white/10 bg-surface/92 p-3.5 shadow-[0_30px_80px_rgba(0,0,0,.5)] backdrop-blur-md sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      <label className={cell}>
        <span className={lab}>{t('home.searchWhere')}</span>
        <select value={pickup} onChange={(e) => setPickup(e.target.value)} className={ctl}>
          {LOCATIONS.map((l) => (
            <option key={l.id} value={l.id} className="bg-surface">{t(l.key)}</option>
          ))}
        </select>
      </label>
      <label className={cell}>
        <span className={lab}>{t('booking.pickupDate')}</span>
        <input type="date" min={today()} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={ctl} />
      </label>
      <label className={cell}>
        <span className={lab}>{t('booking.returnDate')}</span>
        <input type="date" min={pickupDate || today()} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className={ctl} />
      </label>
      <label className={cell}>
        <span className={lab}>{t('home.searchType')}</span>
        <select value={type} onChange={(e) => setType(e.target.value)} className={ctl}>
          <option value="" className="bg-surface">{t('common.all')}</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id} className="bg-surface">{t(c.key)}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="flex min-h-16 items-center justify-center gap-2.5 rounded-[14px] bg-brand-600 px-7 font-bold text-white transition-colors hover:bg-brand-hover sm:col-span-2 lg:col-span-1"
      >
        <Search className="size-[18px]" aria-hidden />
        {t('home.searchCta')}
      </button>
    </form>
  );
}
