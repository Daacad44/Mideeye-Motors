import { Search, CalendarCheck, KeyRound } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

const steps = [
  {
    icon: Search,
    step: '01',
    title: 'Choose your car',
    desc: 'Browse our premium fleet and pick the perfect vehicle for your journey.',
  },
  {
    icon: CalendarCheck,
    step: '02',
    title: 'Book & confirm',
    desc: 'Select your dates, add extras and confirm in a few effortless taps.',
  },
  {
    icon: KeyRound,
    step: '03',
    title: 'Hit the road',
    desc: 'Collect your spotless, fully-insured car — or have it delivered to you.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-gradient-to-b from-mist-200 to-white">
      <div className="mx-auto max-w-[1360px] px-5 py-20 lg:px-8 lg:py-24">
        <div className="mb-12 flex justify-center">
          <SectionHeading
            eyebrow="Simple Process"
            title="Rent in"
            highlight="three easy steps"
            align="center"
          />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.step} index={i}>
              <div className="relative h-full overflow-hidden rounded-3xl border border-line bg-white p-8 shadow-[var(--shadow-soft)]">
                <span className="absolute -right-2 -top-4 font-display text-[90px] font-extrabold text-brand-100">
                  {s.step}
                </span>
                <span className="relative grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-[var(--shadow-glow-brand)]">
                  <s.icon className="size-7" />
                </span>
                <h3 className="relative mt-6 font-display text-xl font-bold text-navy-700">
                  {s.title}
                </h3>
                <p className="relative mt-2.5 text-[15px] leading-relaxed text-ink-500">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
