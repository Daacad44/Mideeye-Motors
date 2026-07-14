import { ShieldCheck, Tag, Clock, FileCheck2, Users, Zap } from 'lucide-react';
import { Reveal } from '../ui/Reveal';

const items = [
  { icon: ShieldCheck, title: 'Reliable & Safe', desc: 'Meticulously maintained' },
  { icon: Tag, title: 'Best Prices', desc: 'Guaranteed value' },
  { icon: Clock, title: '24/7 Support', desc: 'Here for you anytime' },
  { icon: FileCheck2, title: 'Full Insurance', desc: 'Comprehensive cover' },
  { icon: Users, title: 'Pro Drivers', desc: 'On request' },
  { icon: Zap, title: 'Easy Booking', desc: 'Reserve in minutes' },
];

export function TrustStrip() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 pb-2 pt-14 lg:px-8">
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it, i) => (
          <Reveal key={it.title} index={i}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600">
                <it.icon className="size-5" />
              </span>
              <div>
                <div className="text-[14.5px] font-bold text-navy-700">{it.title}</div>
                <div className="text-[12.5px] text-ink-400">{it.desc}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
