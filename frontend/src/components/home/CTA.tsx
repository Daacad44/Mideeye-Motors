import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { useI18n } from '@/context/LocaleContext';
import { HERO_PHOTO } from '@/lib/bundledPhotos';

export function CTA() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 lg:py-24">
      <div className="relative isolate flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[28px] border border-white/8 px-6 py-14 sm:px-14 sm:py-[72px]">
        <img
          src={HERO_PHOTO.rear}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_55%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,9,12,.96)_0%,rgba(7,9,12,.82)_45%,rgba(120,6,18,.45)_100%)]" />
        <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-brand-600" />
        <div>
          <h2 className="poster text-3xl text-white sm:text-4xl lg:text-5xl">{t('home.ctaTitle')}</h2>
          <p className="mt-2 text-[17px] text-ink-500">{t('home.ctaSub')}</p>
        </div>
        <ButtonLink to="/booking" size="lg">
          {t('common.bookNow')} <ArrowRight className="size-[18px]" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}
