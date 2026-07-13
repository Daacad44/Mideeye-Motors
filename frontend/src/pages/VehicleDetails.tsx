import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Star, Users, Gauge, Fuel, Cog, Zap, DoorOpen, MapPin, Palette,
  Check, Expand, ShieldCheck, ArrowRight, ChevronRight,
} from 'lucide-react';
import { useVehicle, useVehicles } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { Lightbox } from '@/components/Lightbox';
import { VehicleCard } from '@/components/VehicleCard';
import { ButtonLink } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/cn';
import type { VehicleImage as VImg } from '@/types/vehicle';

export default function VehicleDetails() {
  const { slug } = useParams();
  const { vehicle, loading } = useVehicle(slug);
  const { vehicles } = useVehicles();
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const images: VImg[] = useMemo(() => {
    if (!vehicle) return [];
    return [
      { publicId: vehicle.coverImage, alt: vehicle.title, tag: 'cover' },
      ...vehicle.gallery,
    ];
  }, [vehicle]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1360px] px-5 py-16 lg:px-8">
        <div className="skeleton h-[520px] rounded-3xl" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-[1360px] px-5 py-32 text-center lg:px-8">
        <h1 className="font-display text-3xl font-extrabold text-navy-700">Vehicle not found</h1>
        <ButtonLink to="/fleet" className="mt-6">Back to Fleet</ButtonLink>
      </div>
    );
  }

  const related = vehicles
    .filter((v) => v.category === vehicle.category && v.id !== vehicle.id)
    .slice(0, 4);

  const specs = [
    { icon: Users, label: 'Seats', value: `${vehicle.seats}` },
    { icon: DoorOpen, label: 'Doors', value: `${vehicle.doors}` },
    { icon: Gauge, label: 'Transmission', value: vehicle.transmission },
    { icon: Fuel, label: 'Fuel', value: vehicle.fuelType },
    { icon: Cog, label: 'Engine', value: vehicle.engine },
    { icon: Zap, label: 'Power', value: `${vehicle.horsePower} hp` },
    { icon: Palette, label: 'Colour', value: vehicle.color },
    { icon: MapPin, label: 'Location', value: vehicle.location },
  ];

  return (
    <div className="bg-mist-100">
      <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-8 lg:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-[13px] font-semibold text-ink-400">
          <Link to="/" className="hover:text-brand-600">Home</Link>
          <ChevronRight className="size-3.5" />
          <Link to="/fleet" className="hover:text-brand-600">Fleet</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-navy-700">{vehicle.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
          {/* Gallery */}
          <div>
            <div className="group relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-mist-200 to-white p-6 shadow-[var(--shadow-soft)]">
              <div className="absolute left-6 top-6 z-10 flex gap-2">
                <span className="rounded-full bg-navy-900/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
                  {vehicle.category}
                </span>
                {vehicle.availability && (
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Available
                  </span>
                )}
              </div>
              <button
                onClick={() => setLightbox(active)}
                className="absolute right-6 top-6 z-10 grid size-11 place-items-center rounded-full bg-white/90 text-navy-700 shadow-md backdrop-blur transition-colors hover:text-brand-600"
                aria-label="Open fullscreen"
              >
                <Expand className="size-5" />
              </button>
              <button onClick={() => setLightbox(active)} className="block w-full cursor-zoom-in">
                <VehicleImage
                  publicId={images[active]?.publicId}
                  alt={images[active]?.alt ?? vehicle.title}
                  fit="contain"
                  priority
                  className="aspect-[16/10] w-full"
                  sizes="(max-width: 1024px) 100vw, 800px"
                />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.publicId}
                  onClick={() => setActive(i)}
                  className={
                    'h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition ' +
                    (i === active ? 'border-brand-500 shadow-md' : 'border-line opacity-70 hover:opacity-100')
                  }
                >
                  <VehicleImage
                    publicId={img.publicId}
                    alt={img.alt}
                    fit="contain"
                    className="h-full w-full"
                    sizes="112px"
                  />
                </button>
              ))}
            </div>

            {/* Description + specs + features */}
            <div className="mt-10">
              <h1 className="font-display text-3xl font-extrabold text-navy-700 lg:text-4xl">
                {vehicle.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-100 px-2.5 py-1 font-bold text-brand-600">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                  {vehicle.rating} <span className="font-medium text-ink-400">({vehicle.reviews} reviews)</span>
                </span>
                <span className="text-ink-500">{vehicle.brand} · {vehicle.year}</span>
              </div>
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-500">
                {vehicle.description}
              </p>

              <h2 className="mt-10 font-display text-xl font-bold text-navy-700">Specifications</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {specs.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
                    <s.icon className="size-5 text-brand-500" />
                    <div className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                      {s.label}
                    </div>
                    <div className="text-[14.5px] font-bold text-navy-700">{s.value}</div>
                  </div>
                ))}
              </div>

              <h2 className="mt-10 font-display text-xl font-bold text-navy-700">Features</h2>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {vehicle.features.map((f) => (
                  <div key={f} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-[15px] font-medium text-navy-700 shadow-[var(--shadow-soft)]">
                    <span className="grid size-6 place-items-center rounded-full bg-brand-100 text-brand-600">
                      <Check className="size-3.5" />
                    </span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky booking widget */}
          <aside>
            <div className="sticky top-24 space-y-4">
              <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-lift)]">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">From</span>
                    <div>
                      <span className="font-display text-4xl font-extrabold text-navy-700">
                        {formatCurrency(vehicle.pricePerDay)}
                      </span>
                      <span className="text-[15px] font-medium text-ink-400"> / day</span>
                    </div>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[13px] font-bold text-emerald-600">
                    {vehicle.availability ? 'In stock' : 'Reserved'}
                  </span>
                </div>

                <div className="my-5 grid grid-cols-2 gap-3">
                  <PriceTile label="Weekly" value={vehicle.pricePerWeek} />
                  <PriceTile label="Monthly" value={vehicle.pricePerMonth} />
                </div>

                <ButtonLink to={`/booking?vehicle=${vehicle.slug}`} className="w-full" size="lg">
                  Book This Car <ArrowRight className="size-4" />
                </ButtonLink>
                <Link
                  to="/fleet"
                  className="mt-3 flex w-full items-center justify-center rounded-xl border border-line px-6 py-3.5 text-[15px] font-bold text-navy-700 transition-colors hover:border-brand-400 hover:text-brand-600"
                >
                  Back to Fleet
                </Link>

                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-100/60 p-4 text-[13.5px] text-navy-700">
                  <ShieldCheck className="size-8 shrink-0 text-brand-600" />
                  <span>Free cancellation up to 48h before pickup · Full insurance included.</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-8 font-display text-2xl font-extrabold text-navy-700 lg:text-3xl">
              Related <span className="text-brand-600">vehicles</span>
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox
          images={images}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      )}
    </div>
  );
}

function PriceTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-mist-100 p-3.5 text-center">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      <div className="font-display text-lg font-extrabold text-navy-700">{formatCurrency(value)}</div>
    </div>
  );
}
