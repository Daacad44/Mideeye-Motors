import { PageHeader } from '@/components/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { Target, Gem, HeartHandshake, TrendingUp } from 'lucide-react';

const values = [
  { icon: Gem, title: 'Premium quality', desc: 'Every vehicle is showroom-clean, fully serviced and fully insured.' },
  { icon: HeartHandshake, title: 'Customer first', desc: '24/7 concierge support and free doorstep delivery on request.' },
  { icon: Target, title: 'Reliability', desc: 'On-time, every time — with transparent, honest pricing.' },
  { icon: TrendingUp, title: 'Always growing', desc: 'A fleet that expands with the latest models, year after year.' },
];

const stats = [
  { v: '150+', l: 'Vehicles' },
  { v: '12K+', l: 'Happy renters' },
  { v: '4.9', l: 'Avg rating' },
  { v: '3', l: 'City branches' },
];

export default function About() {
  return (
    <div className="bg-mist-100">
      <PageHeader crumb="About" title="Driven by excellence" subtitle="Somalia’s premier car rental company, on a mission to make premium mobility effortless." />
      <div className="mx-auto max-w-[1360px] px-5 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="text-[12.5px] font-bold uppercase tracking-[0.18em] text-amber-500">Our Story</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-navy-700 lg:text-4xl">
              From one Land Cruiser to a nationwide fleet
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-ink-500">
              Mideeye Motors began with a single promise: give every traveller a
              spotless, dependable and beautifully-maintained vehicle. Today we
              operate a curated fleet of SUVs, executive sedans, luxury saloons and
              electric cars across Mogadishu, Hargeisa and Kismayo.
            </p>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-500">
              We obsess over the details others overlook — the shine on the paint,
              the freshness of the cabin, the ease of booking — so your only job is
              to enjoy the drive.
            </p>
          </Reveal>
          <Reveal index={1}>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.l} className="rounded-3xl border border-line bg-white p-8 text-center shadow-[var(--shadow-soft)]">
                  <div className="font-display text-4xl font-extrabold text-brand-600">{s.v}</div>
                  <div className="mt-1 text-[14px] font-semibold text-ink-400">{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal key={v.title} index={i}>
              <div className="h-full rounded-3xl border border-line bg-white p-7 shadow-[var(--shadow-soft)]">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white">
                  <v.icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-navy-700">{v.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
