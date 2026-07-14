import { Link } from 'react-router-dom';
import { Car, Truck, Zap, Crown, Bus, CarFront } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

const categories = [
  { name: 'SUV', icon: Car, count: 2 },
  { name: 'Sedan', icon: CarFront, count: 2 },
  { name: 'Luxury', icon: Crown, count: 2 },
  { name: 'Pickup', icon: Truck, count: 1 },
  { name: 'Electric', icon: Zap, count: 1 },
  { name: 'Van', icon: Bus, count: 1 },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 py-20 lg:px-8 lg:py-24">
      <div className="mb-10 flex justify-center">
        <SectionHeading
          eyebrow="Browse by Type"
          title="Find your"
          highlight="perfect ride"
          align="center"
          eyebrowColor="brand"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c, i) => (
          <Reveal key={c.name} index={i}>
            <Link
              to={`/fleet?type=${c.name}`}
              className="group flex flex-col items-center gap-3 rounded-3xl border border-line bg-white px-4 py-7 text-center shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-400 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <c.icon className="size-7" />
              </span>
              <span className="font-display font-bold text-navy-700">{c.name}</span>
              <span className="text-[12.5px] text-ink-400">{c.count} vehicles</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
