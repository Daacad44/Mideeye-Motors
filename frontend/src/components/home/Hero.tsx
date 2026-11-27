import { motion } from 'framer-motion';
import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../ui/Button';
import { SearchCard } from './SearchCard';
import { useI18n, useCurrency } from '@/context/LocaleContext';
import { useBranding, useHeroImage } from '@/lib/branding';
import { HERO_PHOTO, SPOTLIGHT_SLUG } from '@/lib/bundledPhotos';
import { useVehicle } from '@/hooks/useVehicles';
import { ik } from '@/lib/imagekitImages';

/**
 * Full-bleed photo hero. The photo is the admin-set hero image (Media Library)
 * when there is one, otherwise the bundled Prado TX shot. A left-to-right dark
 * gradient keeps the copy readable over any photo.
 */
export function Hero() {
  const { t } = useI18n();
  const { money } = useCurrency();
  const adminHero = useHeroImage();
  const { phone } = useBranding();
  const { vehicle: spotlight } = useVehicle(SPOTLIGHT_SLUG);

  return (
    <section className="relative isolate overflow-hidden bg-navy-900">
      <picture>
        {!adminHero && <source media="(max-width: 640px)" srcSet={HERO_PHOTO.portrait} />}
        <img
          src={adminHero?.url ?? HERO_PHOTO.landscape}
          alt=""
          aria-hidden
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_30%] sm:object-[72%_40%]"
        />
      </picture>
      {/* Readability: dark from the left on desktop, from the bottom on phones */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,9,12,.25)_0%,rgba(7,9,12,.35)_35%,rgba(7,9,12,.92)_70%,#07090c_100%)] sm:bg-[linear-gradient(90deg,#07090c_0%,rgba(7,9,12,.94)_28%,rgba(7,9,12,.55)_52%,rgba(7,9,12,.08)_75%),linear-gradient(180deg,rgba(7,9,12,.55)_0%,transparent_22%,transparent_58%,#07090c_100%)]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(700px_300px_at_80%_78%,rgba(229,20,43,.16),transparent_70%)]" />

      <div className="mx-auto flex min-h-[620px] max-w-[1320px] flex-wrap items-end gap-10 px-4 pt-40 sm:min-h-[600px] sm:items-center sm:px-6 sm:pt-28">
        <motion.div
          className="min-w-0 flex-[1_1_460px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-brand-600/45 bg-brand-600/10 px-3.5 py-1.5 text-[13px] font-semibold text-brand-300">
            <span className="size-[7px] rounded-full bg-brand-500" aria-hidden />
            {t('home.cities')}
          </div>
          <h1 className="poster mt-5 text-[46px] text-white sm:text-6xl lg:text-[84px]">
            {t('hero.titleTop')}
            <br />
            {t('hero.titleMid')} <span className="text-brand-600">{t('hero.titleHi')}</span>
          </h1>
          <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ink-700 sm:text-lg">{t('home.heroSub')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/fleet" size="lg">
              {t('hero.exploreFleet')} <ArrowRight className="size-[18px]" aria-hidden />
            </ButtonLink>
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                className="inline-flex min-h-14 items-center gap-2.5 rounded-[14px] border border-white/16 px-6 font-semibold text-white transition-colors hover:bg-white/8"
              >
                <Phone className="size-[18px]" aria-hidden /> {phone}
              </a>
            ) : (
              <ButtonLink to="/booking" size="lg" variant="outline-light">
                {t('hero.quickBook')}
              </ButtonLink>
            )}
          </div>
        </motion.div>

        {spotlight && (
          <motion.div
            className="hidden min-w-0 flex-[1_1_480px] justify-end self-end pb-4 sm:flex"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              to={`/fleet/${spotlight.slug}`}
              className="glass flex items-center gap-3.5 rounded-2xl py-3 pl-3 pr-5 transition-colors hover:border-brand-600/60"
            >
              {spotlight.thumbnail && (
                <img
                  src={ik((spotlight.gallery.find((g) => g.tag === 'interior') ?? spotlight.thumbnail).filePath, 'thumb')}
                  alt=""
                  aria-hidden
                  className="size-16 rounded-xl object-cover"
                />
              )}
              <span>
                <span className="block text-xs uppercase tracking-[0.06em] text-ink-500">
                  {spotlight.title} · {spotlight.category}
                </span>
                <span className="font-display text-[22px] font-bold text-white">
                  {money(spotlight.pricePerDay)}{' '}
                  <span className="text-sm font-medium text-ink-400">{t('common.perDay')}</span>
                </span>
              </span>
              <ArrowRight className="ml-1 size-[18px] text-brand-400" aria-hidden />
            </Link>
          </motion.div>
        )}
      </div>

      <div className="relative mx-auto max-w-[1320px] px-4 pb-16 pt-10 sm:px-6">
        <SearchCard />
      </div>
    </section>
  );
}
