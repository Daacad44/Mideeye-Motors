import { useI18n, useCurrency } from '@/context/LocaleContext';
import { useVehicles } from '@/hooks/useVehicles';
import { LOCATIONS } from '@/lib/locations';
import { CATEGORIES } from '@/lib/categories';

/** Poster-style numbers under the hero: lowest price, cities, categories, payment. */
export function SpecStrip() {
  const { t } = useI18n();
  const { money } = useCurrency();
  const { vehicles } = useVehicles();
  const prices = vehicles.filter((v) => v.availability).map((v) => v.pricePerDay);
  const from = prices.length ? Math.min(...prices) : null;

  const items = [
    { label: t('home.statFrom'), value: from != null ? money(from) : '—', sub: t('home.statPerDay') },
    { label: t('home.statCities'), value: String(LOCATIONS.length), sub: LOCATIONS.map((l) => t(l.key)).join(' · ') },
    { label: t('home.statTypes'), value: String(CATEGORIES.length), sub: CATEGORIES.map((c) => t(c.key)).join(', ') },
    { label: t('home.statPayment'), value: 'WaafiPay', sub: t('home.statPaymentSub') },
  ];

  return (
    <section aria-label={t('home.statsLabel')} className="border-y border-white/8 bg-inset">
      <dl className="mx-auto grid max-w-[1320px] grid-cols-1 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={
              'flex flex-col gap-1 py-7 sm:px-6 ' +
              (i > 0 ? 'border-t border-white/8 sm:border-t-0 ' : '') +
              (i % 2 === 1 ? 'sm:border-l sm:border-white/8 ' : '') +
              (i === 2 ? 'lg:border-l lg:border-white/8 sm:border-t lg:border-t-0 ' : '') +
              (i === 3 ? 'sm:border-t lg:border-t-0 ' : '')
            }
          >
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">{it.label}</dt>
            <dd className="m-0 font-display text-[44px] font-extrabold leading-[1.05] tracking-tight text-white tabular-nums">
              {it.value}
            </dd>
            <dd className="m-0 text-sm text-ink-500">{it.sub}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
