import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { useI18n } from '@/context/LocaleContext';
import { CATEGORIES } from '@/lib/categories';

export function Categories() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-20 sm:px-6 lg:pt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow={t('home.catEyebrow')} title={t('home.catTitle')} />
        <Link to="/fleet" className="inline-flex items-center gap-2 font-semibold text-ink-700 hover:text-white">
          {t('home.seeAll')} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((c, i) => (
          <Reveal key={c.id} index={i}>
            <Link
              to={`/fleet?type=${c.id}`}
              className="group flex h-full flex-col gap-3 rounded-[18px] border border-white/8 bg-surface p-5 transition-colors hover:border-brand-600/60 hover:bg-[#131821]"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-600/12 text-brand-400">
                <c.icon className="size-[22px]" aria-hidden />
              </span>
              <span className="font-display text-lg font-bold text-white">{t(c.key)}</span>
              <span className="text-[13px] text-ink-400">{t(c.hint)}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
