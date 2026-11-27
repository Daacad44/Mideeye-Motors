import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Vehicle } from '@/types/vehicle';
import { VehicleImage } from './VehicleImage';
import { useCurrency, useI18n } from '@/context/LocaleContext';
import { categoryKey } from '@/lib/categories';
import { locationKey } from '@/lib/locations';

/**
 * Fleet card: dark stage with a red glow under the car, category + status
 * pills, three spec chips, price and one action. `tripQuery` carries the
 * search (location/dates) through to the details and booking pages.
 */
export function VehicleCard({
  vehicle: v,
  index = 0,
  tripQuery = '',
}: {
  vehicle: Vehicle;
  index?: number;
  tripQuery?: string;
}) {
  const { money } = useCurrency();
  const { t } = useI18n();
  const href = `/fleet/${v.slug}${tripQuery ? `?${tripQuery}` : ''}`;
  const photo = v.coverImage ?? v.thumbnail ?? v.heroImage;
  const loc = locationKey(v.location);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1], delay: (index % 4) * 0.06 }}
      className="group relative flex flex-col overflow-hidden rounded-[22px] border border-white/8 bg-surface transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand-600/55 motion-reduce:hover:translate-y-0"
    >
      <div className="relative bg-[radial-gradient(240px_120px_at_50%_80%,rgba(229,20,43,.18),transparent_70%),#11161d] px-4 pb-1.5 pt-7">
        <span className="absolute left-3 top-3 z-10 rounded-lg border border-white/10 bg-navy-900/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-white">
          {t(categoryKey(v.category) ?? v.category)}
        </span>
        <span
          className={
            'absolute right-3 top-3 z-10 rounded-lg px-2.5 py-1 text-[11px] font-bold ' +
            (v.availability ? 'bg-emerald-500/16 text-emerald-400' : 'bg-amber-500/16 text-amber-400')
          }
        >
          {v.availability ? t('fleet.available') : t('fleet.rented')}
        </span>
        <Link to={href} tabIndex={-1} aria-hidden>
          <VehicleImage
            filePath={photo?.filePath}
            alt={photo?.alt || v.title}
            preset="card"
            fit="contain"
            className="aspect-[1200/420] w-full"
            imgClassName="mix-blend-lighten"
            sizes="(max-width: 640px) 90vw, 320px"
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-[18px] pb-[18px] pt-4">
        <div>
          <h3 className="font-display text-[19px] font-bold text-white">
            <Link to={href} className="after:absolute after:inset-0 hover:text-white focus-visible:outline-none">
              {v.title}
            </Link>
          </h3>
          <p className="text-[13px] text-ink-400">{loc ? t(loc) : v.location}</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center text-xs text-ink-500">
          <span className="rounded-lg bg-elevated px-1 py-[7px]">{v.seats} {t('fleet.seatsShort')}</span>
          <span className="rounded-lg bg-elevated px-1 py-[7px]">{t(`values.${v.transmission}`)}</span>
          <span className="rounded-lg bg-elevated px-1 py-[7px]">{t(`values.${v.fuelType}`)}</span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-white/7 pt-3">
          <div>
            <span className="font-display text-2xl font-extrabold tabular-nums text-white">{money(v.pricePerDay)}</span>
            <span className="text-[13px] text-ink-400"> {t('common.perDay')}</span>
          </div>
          <span className="relative z-10 inline-flex min-h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors group-hover:bg-brand-hover">
            {t('common.view')}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
