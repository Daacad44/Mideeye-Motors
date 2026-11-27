import { useEffect, useMemo, useState } from 'react';
import type { Vehicle } from '@/types/vehicle';
import { api } from '@/lib/api';
import { VehicleCard } from '../VehicleCard';
import { SectionHeading } from '../ui/SectionHeading';
import { useI18n } from '@/context/LocaleContext';
import { cn } from '@/lib/cn';

type Tab = 'popular' | 'budget' | 'luxury';

export function Featured() {
  const { t } = useI18n();
  const [all, setAll] = useState<Vehicle[]>([]);
  const [tab, setTab] = useState<Tab>('popular');

  useEffect(() => {
    api.listVehicles().then(setAll);
  }, []);

  const cars = useMemo(() => {
    const list = all.filter((v) => v.availability);
    if (tab === 'budget') return [...list].sort((a, b) => a.pricePerDay - b.pricePerDay).slice(0, 4);
    if (tab === 'luxury') return list.filter((v) => v.category === 'Luxury' || v.pricePerDay >= 140).slice(0, 4);
    return list.filter((v) => v.featured).slice(0, 4);
  }, [all, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'popular', label: t('home.tabPopular') },
    { id: 'budget', label: t('home.tabBudget') },
    { id: 'luxury', label: t('home.tabLuxury') },
  ];

  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-20 sm:px-6 lg:pt-24">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow={t('home.featEyebrow')} title={t('home.featTitle')} />
        <div role="tablist" aria-label={t('home.featSort')} className="flex gap-1.5 rounded-xl border border-white/8 bg-surface p-1">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                'min-h-10 rounded-[9px] px-3.5 text-sm font-semibold transition-colors',
                tab === tb.id ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-white',
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {cars.map((v, i) => (
          <VehicleCard key={v.id} vehicle={v} index={i} />
        ))}
      </div>
    </section>
  );
}
