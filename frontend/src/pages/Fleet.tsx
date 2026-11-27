import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { VehicleCard } from '@/components/VehicleCard';
import { useCurrency, useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';
import { CATEGORIES } from '@/lib/categories';
import { LOCATIONS, tripQuery } from '@/lib/locations';
import { cn } from '@/lib/cn';
import type { FuelType, Transmission, VehicleCategory } from '@/types/vehicle';

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating';
const TRANSMISSIONS: Transmission[] = ['Automatic', 'Manual'];
const FUELS: FuelType[] = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const SEATS = [5, 7, 12] as const;

export default function Fleet() {
  const { t } = useI18n();
  const { money } = useCurrency();
  useSeo({ title: t('fleet.title'), description: t('fleet.subtitle', { count: '' }).trim() });
  const { vehicles, loading } = useVehicles();
  const [params, setParams] = useSearchParams();
  const trip = tripQuery(params);

  const [active, setActive] = useState<VehicleCategory | 'All'>((params.get('type') as VehicleCategory) || 'All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('featured');
  const [location, setLocation] = useState(params.get('pickup') ?? '');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [trans, setTrans] = useState<Transmission[]>([]);
  const [fuels, setFuels] = useState<FuelType[]>([]);
  const [minSeats, setMinSeats] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const priceMax = useMemo(() => Math.max(50, ...vehicles.map((v) => v.pricePerDay)), [vehicles]);
  const priceMin = useMemo(() => (vehicles.length ? Math.min(...vehicles.map((v) => v.pricePerDay)) : 0), [vehicles]);
  const cap = maxPrice ?? priceMax;

  const pickCategory = (c: VehicleCategory | 'All') => {
    setActive(c);
    const next = new URLSearchParams(params);
    if (c === 'All') next.delete('type');
    else next.set('type', c);
    setParams(next, { replace: true });
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const reset = () => {
    setLocation('');
    setMaxPrice(null);
    setTrans([]);
    setFuels([]);
    setMinSeats(null);
    setQuery('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = vehicles.filter(
      (v) =>
        (active === 'All' || v.category === active) &&
        (!q || `${v.title} ${v.brand} ${v.category}`.toLowerCase().includes(q)) &&
        (!location || v.location === location) &&
        v.pricePerDay <= cap &&
        (!trans.length || trans.includes(v.transmission)) &&
        (!fuels.length || fuels.includes(v.fuelType)) &&
        (!minSeats || v.seats >= minSeats),
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.pricePerDay - b.pricePerDay;
        case 'price-desc':
          return b.pricePerDay - a.pricePerDay;
        case 'rating':
          return b.rating - a.rating;
        default:
          return Number(b.featured) - Number(a.featured) || Number(b.availability) - Number(a.availability);
      }
    });
  }, [vehicles, active, query, location, cap, trans, fuels, minSeats, sort]);

  const chip = (on: boolean) =>
    cn(
      'min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors',
      on ? 'border-brand-600 bg-brand-600 text-white' : 'border-white/12 bg-surface text-ink-700 hover:border-white/25',
    );
  const legend = 'mb-2 text-[13px] font-semibold text-ink-500';
  const check = 'flex min-h-9 cursor-pointer items-center gap-2.5 text-[15px] text-ink-700';

  const filters = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('fleet.filters')}</h2>
        <button type="button" onClick={reset} className="min-h-11 text-sm font-semibold text-brand-400 hover:text-brand-300">
          {t('fleet.clear')}
        </button>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-500">{t('specs.location')}</span>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-xl border border-white/12 bg-inset p-3 text-[15px] font-medium text-white focus:border-brand-400 focus:outline-none"
        >
          <option value="">{t('fleet.allLocations')}</option>
          {LOCATIONS.map((l) => (
            <option key={l.id} value={l.id}>{t(l.key)}</option>
          ))}
        </select>
      </label>
      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{t('fleet.pricePerDay')}</legend>
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          step={5}
          value={cap}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          aria-label={t('fleet.maxPrice')}
          className="w-full accent-brand-600"
        />
        <div className="mt-1 flex justify-between text-[13px] text-ink-400">
          <span>{money(priceMin)}</span>
          <span className="font-bold text-white">≤ {money(cap)}</span>
          <span>{money(priceMax)}</span>
        </div>
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{t('specs.transmission')}</legend>
        {TRANSMISSIONS.map((x) => (
          <label key={x} className={check}>
            <input type="checkbox" checked={trans.includes(x)} onChange={() => setTrans((l) => toggle(l, x))} className="size-[18px] accent-brand-600" />
            {t(`values.${x}`)}
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{t('specs.fuel')}</legend>
        {FUELS.map((x) => (
          <label key={x} className={check}>
            <input type="checkbox" checked={fuels.includes(x)} onChange={() => setFuels((l) => toggle(l, x))} className="size-[18px] accent-brand-600" />
            {t(`values.${x}`)}
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{t('specs.seats')}</legend>
        <div className="flex gap-2">
          {SEATS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={minSeats === n}
              onClick={() => setMinSeats((s) => (s === n ? null : n))}
              className={cn(
                'min-h-11 flex-1 rounded-[10px] border text-sm font-semibold text-white',
                minSeats === n ? 'border-brand-600 bg-brand-600/12' : 'border-white/12 bg-inset',
              )}
            >
              {n}+
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <div>
      <section className="border-b border-white/8 bg-[radial-gradient(700px_240px_at_80%_0%,rgba(229,20,43,.18),transparent_70%),#0b0e13]">
        <div className="mx-auto max-w-[1320px] px-4 pb-9 pt-11 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-[13px] text-ink-400">
            <Link to="/" className="hover:text-white">{t('nav.home')}</Link> / <span className="text-white">{t('nav.fleet')}</span>
          </nav>
          <h1 className="poster mt-2.5 text-4xl text-white sm:text-5xl">{t('fleet.title')}</h1>
          <p className="mt-1.5 text-[17px] text-ink-500">{t('fleet.subtitle', { count: vehicles.length })}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" className={chip(active === 'All')} aria-pressed={active === 'All'} onClick={() => pickCategory('All')}>
              {t('common.all')}
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={chip(active === c.id)} aria-pressed={active === c.id} onClick={() => pickCategory(c.id)}>
                {t(c.key)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1320px] flex-wrap items-start gap-7 px-4 pb-20 pt-8 sm:px-6">
        <aside aria-label={t('fleet.filters')} className="hidden w-[280px] shrink-0 rounded-[20px] border border-white/8 bg-surface p-[22px] lg:block">
          {filters}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink-500">
              <strong className="text-white">{filtered.length}</strong> {t('fleet.found')}
            </p>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
              <label className="flex min-h-11 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-white/12 bg-surface px-3 sm:max-w-xs">
                <Search className="size-4 text-ink-400" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('fleet.searchPlaceholder')}
                  aria-label={t('common.search')}
                  className="w-full bg-transparent text-sm font-medium text-white placeholder:text-ink-400 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-surface px-3.5 text-sm font-semibold text-white lg:hidden"
              >
                <SlidersHorizontal className="size-4" aria-hidden /> {t('fleet.filters')}
              </button>
              <label className="flex items-center gap-2.5 text-sm text-ink-500">
                <span className="hidden sm:inline">{t('home.featSort')}</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="min-h-11 rounded-[10px] border border-white/12 bg-surface px-3 text-sm font-semibold text-white focus:border-brand-400 focus:outline-none"
                >
                  <option value="featured">{t('fleet.sortFeatured')}</option>
                  <option value="price-asc">{t('fleet.sortPriceAsc')}</option>
                  <option value="price-desc">{t('fleet.sortPriceDesc')}</option>
                  <option value="rating">{t('fleet.sortRating')}</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-[380px] rounded-[22px]" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
              {filtered.map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} index={i} tripQuery={trip} />
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-white/8 bg-surface px-6 py-20 text-center">
              <p className="font-display text-xl font-bold text-white">{t('fleet.emptyTitle')}</p>
              <p className="mt-2 text-ink-400">{t('fleet.emptySub')}</p>
              <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl border border-white/14 px-5 text-sm font-semibold text-white hover:bg-white/8">
                {t('fleet.clear')}
              </button>
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('fleet.filters')}>
          <button type="button" aria-label={t('nav.closeMenu')} className="absolute inset-0 bg-black/60" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[min(340px,90vw)] overflow-y-auto border-l border-white/10 bg-surface p-5">
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label={t('nav.closeMenu')}
              className="mb-2 ml-auto grid size-11 place-items-center rounded-xl border border-white/12 text-white"
            >
              <X className="size-5" />
            </button>
            {filters}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-6 min-h-12 w-full rounded-[14px] bg-brand-600 font-bold text-white"
            >
              {t('fleet.showResults', { count: filtered.length })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
