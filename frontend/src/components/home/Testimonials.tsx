import { Star, Quote } from 'lucide-react';
import { Reveal } from '../ui/Reveal';

const reviews = [
  {
    name: 'Amina H.',
    role: 'Business Traveller',
    text: 'The Land Cruiser was immaculate and delivered right to my hotel. Booking took two minutes. Truly premium service from start to finish.',
    initials: 'AH',
  },
  {
    name: 'Yusuf A.',
    role: 'Family Trip',
    text: 'Spacious Santa Fe, spotless interior and unbeatable price. The team went above and beyond. This is how car rental should feel.',
    initials: 'YA',
  },
  {
    name: 'Sagal M.',
    role: 'Weekend Getaway',
    text: 'Drove the Tesla Model 3 for the weekend — flawless. Fully insured, fully charged, zero hassle. I won’t rent anywhere else.',
    initials: 'SM',
  },
];

export function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(150deg,#0d2b50,#08182f)]">
      <div className="pointer-events-none absolute -left-24 top-1/2 size-96 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 dotted-grid opacity-40" />

      <div className="relative mx-auto max-w-[1360px] px-5 py-20 lg:px-8 lg:py-24">
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2.5 text-[12.5px] font-bold uppercase tracking-[0.18em] text-amber-500">
              <span className="h-[3px] w-6 rounded-full bg-amber-500" /> Testimonials
            </span>
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl lg:text-[44px]">
            Loved by <span className="text-gradient">thousands</span> of drivers
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={r.name} index={i}>
              <figure className="glass h-full rounded-3xl p-7">
                <Quote className="size-8 text-amber-500" />
                <div className="mt-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="size-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <blockquote className="mt-4 text-[15px] leading-relaxed text-brand-100/85">
                  “{r.text}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-brand-600 font-bold text-white">
                    {r.initials}
                  </span>
                  <span>
                    <span className="block font-bold text-white">{r.name}</span>
                    <span className="block text-[13px] text-brand-100/60">{r.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
