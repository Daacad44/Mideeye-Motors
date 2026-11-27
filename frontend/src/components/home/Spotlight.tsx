import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { VehicleImage } from '../VehicleImage';
import { useI18n, useCurrency } from '@/context/LocaleContext';
import { useVehicle } from '@/hooks/useVehicles';
import { SPOTLIGHT_SLUG } from '@/lib/bundledPhotos';
import { ik } from '@/lib/imagekitImages';

const DETAIL_TAGS = ['interior', 'dashboard', 'rear'] as const;

/** "Car of the week" poster: side profile, three detail shots, big spec numbers. */
export function Spotlight() {
  const { t } = useI18n();
  const { money } = useCurrency();
  const { vehicle: v } = useVehicle(SPOTLIGHT_SLUG);
  if (!v) return null;

  const side = v.gallery.find((g) => g.tag === 'side') ?? v.coverImage;
  const details = DETAIL_TAGS.map((tag) => v.gallery.find((g) => g.tag === tag)).filter(Boolean);

  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-20 sm:px-6 lg:pt-24">
      <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(700px_300px_at_70%_45%,rgba(229,20,43,.18),transparent_70%),linear-gradient(180deg,#11161d,#07090c)]">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-10 sm:px-12 sm:pt-12">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-brand-400">{t('home.spotEyebrow')}</div>
            <h2 className="mt-2.5 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[64px]">
              {v.title}
            </h2>
            <p className="mt-3 max-w-[560px] text-[17px] text-ink-500">{t('home.spotCopy')}</p>
          </div>
          <ButtonLink to={`/fleet/${v.slug}`}>
            {t('home.spotCta')} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>

        <VehicleImage
          filePath={side?.filePath}
          alt={side?.alt || v.title}
          preset="hero"
          fit="contain"
          className="mx-auto mt-4 aspect-[1792/592] w-full max-w-[1080px]"
          imgClassName="mix-blend-lighten"
        />

        {details.length > 0 && (
          <div className="grid grid-cols-1 gap-3.5 px-6 pb-8 sm:grid-cols-3 sm:px-12">
            {details.map((g) => (
              <figure key={g!.tag} className="relative m-0 overflow-hidden rounded-[18px] border border-white/8">
                <img
                  src={ik(g!.filePath, 'card')}
                  alt={g!.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-[200px] w-full object-cover sm:h-[220px]"
                />
                <figcaption className="absolute bottom-3 left-3 rounded-lg bg-navy-900/80 px-2.5 py-1 text-xs font-bold tracking-[0.06em] text-white">
                  {t(`gallery.${g!.tag}`)}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <dl className="m-0 grid grid-cols-2 gap-px border-t border-white/8 bg-white/8 lg:grid-cols-4">
          <Stat label={t('specs.engine')} value={v.engine} small />
          <Stat label={t('specs.power')} value={String(v.horsePower)} unit="HP" />
          <Stat label={t('specs.seats')} value={String(v.seats)} />
          <Stat label={t('specs.price')} value={money(v.pricePerDay)} unit={t('common.perDay')} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value, unit, small }: { label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <div className="bg-navy-900 px-6 py-6 sm:px-8">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">{label}</dt>
      <dd
        className={
          'm-0 mt-1.5 font-display tabular-nums ' +
          (small ? 'text-[22px] font-bold text-white' : 'text-[40px] font-extrabold leading-[1.1] text-brand-500 sm:text-[44px]')
        }
      >
        {value} {unit && <span className="text-base font-medium text-ink-500">{unit}</span>}
      </dd>
    </div>
  );
}
