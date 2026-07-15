import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { VehicleImage } from '../VehicleImage';
import { SearchCard } from './SearchCard';
import { getVehicleBySlug } from '@/data/vehicles';

const stats = [
  { value: '150+', label: 'Premium Cars' },
  { value: '12K+', label: 'Happy Renters' },
  { value: '4.9', label: 'Avg. Rating' },
];

export function Hero() {
  const hero = getVehicleBySlug('toyota-land-cruiser-2024');

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(118deg,#061423_0%,#0d2b50_52%,#0b67c2_128%)]">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -right-16 -top-36 size-[560px] rounded-full bg-[radial-gradient(circle,#18a8f5,transparent_66%)] opacity-45 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-52 -left-32 size-[520px] rounded-full bg-[radial-gradient(circle,#f59e0b,transparent_70%)] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 dotted-grid opacity-50" />

      <div className="relative z-10 mx-auto max-w-[1360px] px-5 pt-14 lg:px-8 lg:pt-[70px]">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-11">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          >
            <div className="mb-5 inline-flex items-center gap-2.5 text-[12.5px] font-bold uppercase tracking-[0.18em] text-brand-300">
              <span className="h-[3px] w-6 rounded-full bg-amber-500" />
              The 2024 Land Cruiser Collection
            </div>
            <h1 className="font-display text-[46px] font-extrabold leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-[70px]">
              Command
              <br />
              Every <span className="text-gradient">Journey</span>
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-brand-100/80">
              Premium SUVs, executive sedans and the legendary Land Cruiser —
              delivered spotless, fully insured, and ready the moment you are.
            </p>

            <div className="mt-8 flex flex-wrap gap-3.5">
              <ButtonLink to="/fleet" size="lg">
                Explore the Fleet <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink to="/booking" size="lg" variant="outline-light">
                Quick Book
              </ButtonLink>
            </div>

            <div className="mt-11 flex flex-wrap gap-8">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-8">
                  {i > 0 && <span className="h-9 w-px bg-white/15" />}
                  <div>
                    <div className="font-display text-3xl font-extrabold leading-none text-white">
                      {s.value}
                    </div>
                    <div className="mt-1.5 text-[13px] font-semibold text-brand-100/60">
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Car */}
          <motion.div
            className="relative h-[300px] sm:h-[380px] lg:h-[440px]"
            initial={{ opacity: 0, scale: 0.94, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1], delay: 0.15 }}
          >
            <div className="absolute inset-0 animate-float">
              <VehicleImage
                filePath={hero?.heroImage?.filePath}
                alt={hero?.heroImage?.alt || 'Toyota Land Cruiser 2024'}
                preset="hero"
                fit="contain"
                priority
                className="h-full w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
              />
            </div>

            <motion.div
              className="glass absolute left-0 top-3 flex items-center gap-2.5 rounded-2xl px-4 py-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Star className="size-5 fill-amber-500 text-amber-500" />
              <div>
                <div className="text-base font-extrabold leading-none text-white">4.9</div>
                <div className="text-[11px] text-brand-100/70">2,140 reviews</div>
              </div>
            </motion.div>

            <motion.div
              className="glass absolute bottom-14 right-0 rounded-2xl px-5 py-3.5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-100/70">
                From
              </div>
              <div className="font-display text-[22px] font-extrabold leading-tight text-white">
                $120<span className="text-[13px] font-semibold text-brand-100/70"> /day</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Floating search */}
      <div className="relative z-20 mx-auto max-w-[1240px] translate-y-12 px-5 lg:px-8">
        <SearchCard />
      </div>
      <div className="h-16" />
    </section>
  );
}
