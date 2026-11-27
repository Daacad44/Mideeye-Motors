import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { useI18n } from '@/context/LocaleContext';

const STEPS = ['1', '2', '3'] as const;

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-20 sm:px-6 lg:pt-24">
      <SectionHeading eyebrow={t('home.howEyebrow')} title={t('home.howTitle')} />
      <ol className="mt-8 grid list-none gap-4 p-0 md:grid-cols-3">
        {STEPS.map((n, i) => (
          <Reveal key={n} index={i}>
            <li className="h-full rounded-[22px] border border-white/8 bg-surface p-7">
              <div className="font-display text-[56px] font-extrabold leading-none text-brand-600">0{n}</div>
              <h3 className="mt-4 font-display text-xl font-bold text-white">{t(`home.step${n}Title`)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`home.step${n}Desc`)}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
