import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Star, Users, Gauge, Fuel, Cog, Zap, DoorOpen, MapPin, Palette,
  Check, Expand, ShieldCheck, ArrowRight, ChevronRight, CalendarDays, Loader2, MessageSquare,
} from 'lucide-react';
import { useVehicle, useVehicles } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { MonthCalendar } from '@/components/MonthCalendar';
import { Lightbox } from '@/components/Lightbox';
import { VehicleCard } from '@/components/VehicleCard';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';
import { ik } from '@/lib/imagekitImages';
import { vehiclesApi, type Review, type BusyRange } from '@/lib/vehiclesApi';

export interface GalleryItem {
  filePath: string;
  alt: string;
  tag?: string;
}

export default function VehicleDetails() {
  const { slug } = useParams();
  const { vehicle, loading } = useVehicle(slug);
  const { vehicles } = useVehicles();
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { user } = useAuth();
  const { money } = useCurrency();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [calendar, setCalendar] = useState<BusyRange[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const images: GalleryItem[] = useMemo(() => {
    if (!vehicle) return [];
    const cover = vehicle.coverImage
      ? [{ filePath: vehicle.coverImage.filePath, alt: vehicle.coverImage.alt || vehicle.title, tag: 'cover' }]
      : [];
    return [...cover, ...vehicle.gallery.map((g) => ({ filePath: g.filePath, alt: g.alt, tag: g.tag }))];
  }, [vehicle]);

  const vehicleSlug = vehicle?.slug;
  const vehicleId = vehicle?.id;

  useEffect(() => {
    if (!vehicleSlug) return;
    let alive = true;
    vehiclesApi
      .listReviews(vehicleSlug)
      .then((r) => { if (alive) { setReviews(r.data); setCanReview(r.canReview); setReviewsLoaded(true); } })
      .catch(() => { if (alive) setReviewsLoaded(true); });
    return () => { alive = false; };
  }, [vehicleSlug]);

  useEffect(() => {
    if (!vehicleId) return;
    let alive = true;
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 180 * 86400000).toISOString();
    vehiclesApi.getCalendar(vehicleId, from, to).then((r) => { if (alive) setCalendar(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, [vehicleId]);

  const submitReview = async () => {
    if (!vehicleSlug) return;
    setPosting(true);
    setReviewError(null);
    try {
      const { data } = await vehiclesApi.addReview(vehicleSlug, { rating, comment: comment.trim() || undefined });
      setReviews((rs) => [data, ...rs]);
      setCanReview(false);
      setComment('');
    } catch (e) {
      setReviewError((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  useSeo({
    title: vehicle ? `${vehicle.title} — ${vehicle.brand}` : 'Vehicle',
    description: vehicle?.description,
    image: vehicle?.coverImage ? ik(vehicle.coverImage.filePath, 'card') : undefined,
    type: 'product',
  });

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

  // Prefer live review stats once loaded; fall back to the vehicle's cached values.
  const reviewCount = reviewsLoaded ? reviews.length : vehicle.reviews;
  const avgRating = reviewsLoaded
    ? reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0
    : vehicle.rating;

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
                  filePath={images[active]?.filePath}
                  alt={images[active]?.alt ?? vehicle.title}
                  preset="gallery"
                  fit="contain"
                  priority
                  className="aspect-[16/10] w-full"
                />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.filePath}
                  onClick={() => setActive(i)}
                  className={
                    'h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition ' +
                    (i === active ? 'border-brand-500 shadow-md' : 'border-line opacity-70 hover:opacity-100')
                  }
                >
                  <VehicleImage
                    filePath={img.filePath}
                    alt={img.alt}
                    preset="thumb"
                    fit="contain"
                    className="h-full w-full"
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
                  {avgRating || '—'} <span className="font-medium text-ink-400">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
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
                        {money(vehicle.pricePerDay)}
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

              <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
                <h3 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-navy-700">
                  <CalendarDays className="size-4 text-brand-600" /> Availability
                </h3>
                <MonthCalendar ranges={calendar} />
                <p className="mt-3 text-[12px] text-ink-400">Highlighted days are already booked or under maintenance.</p>
              </div>
            </div>
          </aside>
        </div>

        {/* Reviews */}
        <section className="mt-16">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)] lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold text-navy-700">Reviews</h2>
              <div className="flex items-center gap-2 rounded-xl bg-brand-100 px-3 py-1.5 font-bold text-brand-600">
                <Star className="size-4 fill-amber-500 text-amber-500" />
                {avgRating || '—'} <span className="font-medium text-ink-400">· {reviewCount} total</span>
              </div>
            </div>

            {!user ? (
              <div className="mt-5 rounded-2xl border border-line bg-mist-100 px-5 py-4 text-[14px] text-ink-500">
                <Link to="/login" className="font-bold text-brand-600 hover:underline">Sign in</Link> after a completed rental to leave a review.
              </div>
            ) : canReview ? (
              <div className="mt-5 rounded-2xl border border-line p-5">
                <h3 className="flex items-center gap-2 font-display text-[15px] font-bold text-navy-700"><MessageSquare className="size-4 text-brand-600" /> Write a review</h3>
                {reviewError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-600">{reviewError}</div>}
                <div className="mt-3"><StarInput value={rating} onChange={setRating} /></div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)" rows={3}
                  className="mt-3 w-full rounded-xl border border-line px-4 py-3 text-[14px] text-navy-700 focus:border-brand-400 focus:outline-none" />
                <button onClick={submitReview} disabled={posting}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-navy-700 disabled:opacity-60">
                  {posting ? <Loader2 className="size-4 animate-spin" /> : 'Submit review'}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-line bg-mist-100 px-5 py-4 text-[14px] text-ink-500">
                Rent this car and complete your trip to leave a review.
              </div>
            )}

            <div className="mt-6 space-y-4">
              {reviewsLoaded && reviews.length === 0 && (
                <p className="text-[14px] text-ink-400">No reviews yet — be the first after your trip.</p>
              )}
              {reviews.map((r) => (
                <div key={r.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-navy-700">{r.reviewer}</div>
                    <div className="text-[12px] text-ink-400">{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                  </div>
                  <div className="mt-1"><Stars value={r.rating} /></div>
                  {r.comment && <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

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
  const { money } = useCurrency();
  return (
    <div className="rounded-2xl border border-line bg-mist-100 p-3.5 text-center">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      <div className="font-display text-lg font-extrabold text-navy-700">{money(value)}</div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={'size-4 ' + (n <= value ? 'fill-amber-500 text-amber-500' : 'text-line')} />
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <Star className={'size-7 transition ' + (n <= value ? 'fill-amber-500 text-amber-500' : 'text-line hover:text-amber-300')} />
        </button>
      ))}
    </div>
  );
}
