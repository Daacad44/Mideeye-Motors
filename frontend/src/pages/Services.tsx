import { PageHeader } from '@/components/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { CTA } from '@/components/home/CTA';
import { Car, Plane, Briefcase, MapPinned, ShieldCheck, Wrench } from 'lucide-react';

const services = [
  { icon: Car, title: 'Self-drive rental', desc: 'Daily, weekly and monthly rentals across our entire premium fleet.' },
  { icon: Briefcase, title: 'Chauffeur service', desc: 'Professional, vetted drivers for business and executive travel.' },
  { icon: Plane, title: 'Airport transfers', desc: 'Punctual pickups and drop-offs at Aden Adde International and beyond.' },
  { icon: MapPinned, title: 'Long-distance tours', desc: 'Comfortable, capable vehicles for intercity and off-road journeys.' },
  { icon: ShieldCheck, title: 'Corporate leasing', desc: 'Flexible fleet solutions and priority support for organisations.' },
  { icon: Wrench, title: 'Doorstep delivery', desc: 'We bring the car to you — spotless, fuelled and ready to drive.' },
];

export default function Services() {
  return (
    <div className="bg-mist-100">
      <PageHeader crumb="Services" title="Everything you need to move" subtitle="From a weekend getaway to a corporate fleet, Mideeye Motors has you covered." />
      <div className="mx-auto max-w-[1360px] px-5 py-20 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.title} index={i}>
              <div className="group h-full rounded-3xl border border-line bg-white p-8 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
                <span className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <s.icon className="size-7" />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-navy-700">{s.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-500">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <CTA />
    </div>
  );
}
