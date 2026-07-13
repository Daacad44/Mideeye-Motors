import { Link } from 'react-router-dom';
import { Heart, Users, Gauge, Fuel, Star, ArrowRight, GitCompareArrows } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Vehicle } from '@/types/vehicle';
import { VehicleImage } from './VehicleImage';
import { formatCurrency } from '@/lib/cn';

export function VehicleCard({ vehicle, index = 0 }: { vehicle: Vehicle; index?: number }) {
  const [fav, setFav] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1], delay: (index % 4) * 0.07 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)] transition-all duration-500 hover:-translate-y-1.5 hover:border-brand-400/50 hover:shadow-[var(--shadow-lift)]"
    >
      {/* Media */}
      <div className="relative bg-gradient-to-b from-mist-200 to-white p-4 pb-0">
        <div className="absolute left-4 top-4 z-10 flex gap-2">
          {vehicle.featured && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
              Featured
            </span>
          )}
          <span className="rounded-full bg-navy-900/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
            {vehicle.category}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setFav((v) => !v)}
          aria-label="Save to favourites"
          aria-pressed={fav}
          className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/90 text-navy-700 shadow-md backdrop-blur transition-colors hover:text-amber-500"
        >
          <Heart className={fav ? 'size-5 fill-amber-500 text-amber-500' : 'size-5'} />
        </button>

        <Link to={`/fleet/${vehicle.slug}`}>
          <VehicleImage
            publicId={vehicle.coverImage}
            alt={vehicle.title}
            fit="contain"
            className="aspect-[16/10] w-full transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 90vw, 320px"
          />
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-[17px] font-bold text-navy-700">
              <Link to={`/fleet/${vehicle.slug}`} className="hover:text-brand-600">
                {vehicle.title}
              </Link>
            </h3>
            <p className="text-[13px] text-ink-400">{vehicle.brand} · {vehicle.year}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-100 px-2 py-1 text-[13px] font-bold text-brand-600">
            <Star className="size-3.5 fill-amber-500 text-amber-500" />
            {vehicle.rating}
          </div>
        </div>

        {/* Specs */}
        <div className="my-4 grid grid-cols-3 gap-2 border-y border-line py-3 text-[12.5px] text-ink-500">
          <Spec icon={<Users className="size-4" />} label={`${vehicle.seats} Seats`} />
          <Spec icon={<Gauge className="size-4" />} label={vehicle.transmission} />
          <Spec icon={<Fuel className="size-4" />} label={vehicle.fuelType} />
        </div>

        {/* Price + actions */}
        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="font-display text-2xl font-extrabold text-navy-700">
              {formatCurrency(vehicle.pricePerDay)}
            </span>
            <span className="text-[13px] font-medium text-ink-400"> / day</span>
          </div>
          <button
            type="button"
            aria-label="Add to compare"
            className="grid size-10 place-items-center rounded-xl border border-line text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600"
          >
            <GitCompareArrows className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Link
            to={`/booking?vehicle=${vehicle.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-navy-700"
          >
            Book Now <ArrowRight className="size-4" />
          </Link>
          <Link
            to={`/fleet/${vehicle.slug}`}
            className="inline-flex items-center justify-center rounded-xl border border-line px-4 py-3 text-sm font-bold text-navy-700 transition-colors hover:border-brand-400 hover:text-brand-600"
          >
            View
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-brand-500">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
