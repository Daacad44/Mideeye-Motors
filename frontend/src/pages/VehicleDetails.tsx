import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Star, Check, Expand, ArrowRight, CalendarDays, Loader2, MessageSquare, Gauge, Users, Cog } from 'lucide-react';
import { useVehicle, useVehicles } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { MonthCalendar } from '@/components/MonthCalendar';
import { Lightbox } from '@/components/Lightbox';
import { VehicleCard } from '@/components/VehicleCard';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useCurrency, useI18n } from '@/context/LocaleContext';
import { bookingsApi } from '@/lib/bookingsApi';
import { categoryKey } from '@/lib/categories';
import { locationKey } from '@/lib/locations';
import { cn } from '@/lib/cn';
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

  const { t, locale } = useI18n();
  const [params] = useSearchParams();
  const [pickupDate, setPickupDate] = useState(params.get('pickupDate') ?? '');
  const [returnDate, setReturnDate] = useState(params.get('returnDate') ?? '');
  const [available, setAvailable] = useState<boolean | null>(null);

  const images: GalleryItem[] = useMemo(() => {
    if (!vehicle) return [];
    const list: GalleryItem[] = [
      ...vehicle.gallery.map((g) => ({ filePath: g.filePath, alt: g.alt, tag: g.tag })),
      ...(vehicle.coverImage ? [{ filePath: vehicle.coverImage.filePath, alt: vehicle.coverImage.alt || vehicle.title, tag: 'side' }] : []),
    ];
    // De-duplicate (the cover is often also in the gallery).
    return list.filter((img, i) => list.findIndex((x) => x.filePath === img.filePath) === i);
  }, [vehicle]);

  const datesValid = !!pickupDate && !!returnDate && new Date(returnDate) > new Date(pickupDate);
  useEffect(() => {
    if (!vehicle || !datesValid) { setAvailable(null); return; }
    let alive = true;
    bookingsApi
      .checkAvailability(vehicle!.slug, pickupDate, returnDate)
      .then((r) => { if (alive) setAvailable(r.data.available); })
      .catch(() => { if (alive) setAvailable(null); });
    return () => { alive = false; };
  }, [vehicle, pickupDate, returnDate, datesValid]);

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
    title: vehicle ? `${vehicle.title} — Daljir Rental Car` : 'Daljir Rental Car',
    description: vehicle?.description,
    image: vehicle?.heroImage ? ik(vehicle.heroImage.filePath, 'card') : undefined,
    type: 'product',
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6">
        <div className="skeleton h-[520px] rounded-[28px]" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-[1320px] px-4 py-32 text-center sm:px-6">
        <h1 className="poster text-4xl text-white">{t('vehicle.notFound')}</h1>
        <ButtonLink to="/fleet" className="mt-6">{t('vehicle.backToFleet')}</ButtonLink>
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

  const days = datesValid ? Math.max(1, Math.round((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86400000)) : 0;
  const carTotal = vehicle.pricePerDay * days;
  const tax = carTotal * 0.05;
  const side = vehicle.gallery.find((g) => g.tag === 'side') ?? vehicle.coverImage ?? vehicle.heroImage;
  const loc = locationKey(vehicle.location);
  const bookingHref = `/booking?${new URLSearchParams({
    vehicle: vehicle.slug,
    ...(pickupDate ? { pickupDate } : {}),
    ...(returnDate ? { returnDate } : {}),
    ...(params.get('pickup') ? { pickup: params.get('pickup')! } : {}),
  }).toString()}`;
  const today = new Date().toISOString().slice(0, 10);

  const specRows = [
    { k: t('specs.year'), v: String(vehicle.year) },
    { k: t('specs.brand'), v: vehicle.brand },
    { k: t('specs.engine'), v: vehicle.engine },
    { k: t('specs.power'), v: `${vehicle.horsePower} HP` },
    { k: t('specs.fuel'), v: t(`values.${vehicle.fuelType}`) },
    { k: t('specs.transmission'), v: t(`values.${vehicle.transmission}`) },
    { k: t('specs.seats'), v: String(vehicle.seats) },
    { k: t('specs.doors'), v: String(vehicle.doors) },
    { k: t('specs.color'), v: vehicle.color },
    { k: t('specs.mileage'), v: vehicle.mileage },
  ];

  return (
    <div>
      {/* Poster hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(900px_380px_at_50%_78%,rgba(229,20,43,.22),transparent_70%),linear-gradient(180deg,#0b0e13,#07090c)]">
        <div className="mx-auto max-w-[1320px] px-4 pt-8 sm:px-6 sm:pt-12">
          <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-ink-400">
            <Link to="/" className="hover:text-white">{t('nav.home')}</Link> /{' '}
            <Link to="/fleet" className="hover:text-white">{t('nav.fleet')}</Link> /{' '}
            <span className="text-white">{vehicle.title}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-extrabold tracking-[0.06em] text-white">
                  {t(categoryKey(vehicle.category) ?? vehicle.category).toUpperCase()}
                </span>
                <span className={cn('rounded-lg px-3 py-1.5 text-xs font-bold', vehicle.availability ? 'bg-emerald-500/16 text-emerald-400' : 'bg-amber-500/16 text-amber-400')}>
                  {vehicle.availability ? t('fleet.available') : t('fleet.rented')}
                </span>
                <span className="rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-ink-700">{loc ? t(loc) : vehicle.location}</span>
              </div>
              <h1 className="poster mt-4 text-[44px] text-white sm:text-6xl lg:text-[80px]">{vehicle.title}</h1>
              <p className="mt-4 max-w-[560px] text-[17px] text-ink-500">{vehicle.description}</p>
            </div>
            {reviewCount > 0 && (
              <div className="flex items-center gap-2.5 text-ink-700">
                <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-bold text-white">{avgRating}</span>
                <span className="text-ink-400">· {reviewCount} {t('vehicle.reviewsCount')}</span>
              </div>
            )}
          </div>
          <VehicleImage
            filePath={side?.filePath}
            alt={side?.alt || vehicle.title}
            preset="hero"
            fit="contain"
            priority
            className="mx-auto mt-6 aspect-[1792/592] w-full max-w-[1160px]"
            imgClassName="mix-blend-lighten"
          />
        </div>

        {/* Spec strip */}
        <dl className="m-0 border-y border-white/8 bg-navy-900/70">
          <div className="mx-auto grid max-w-[1320px] grid-cols-2 px-4 sm:px-6 md:grid-cols-5">
            <SpecCell icon={Cog} label={t('specs.engine')} value={vehicle.engine} />
            <SpecCell big label={t('specs.power')} value={String(vehicle.horsePower)} unit="HP" />
            <SpecCell icon={Users} big label={t('specs.seats')} value={String(vehicle.seats)} />
            <SpecCell icon={Gauge} label={t('specs.transmission')} value={t(`values.${vehicle.transmission}`)} />
            <SpecCell big label={t('specs.price')} value={money(vehicle.pricePerDay)} unit={t('common.perDay')} />
          </div>
        </dl>
      </section>

      <div className="mx-auto flex max-w-[1320px] flex-wrap items-start gap-7 px-4 pb-20 pt-10 sm:px-6">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-10">
          {/* Gallery */}
          {images.length > 0 && (
            <section aria-label={t('vehicle.photos')}>
              <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-surface">
                <button type="button" onClick={() => setLightbox(active)} className="block w-full cursor-zoom-in" aria-label={t('vehicle.enlarge')}>
                  <VehicleImage
                    filePath={images[active]?.filePath}
                    alt={images[active]?.alt ?? vehicle.title}
                    preset="gallery"
                    fit={images[active]?.tag === 'side' ? 'contain' : 'cover'}
                    className="aspect-[2/1] w-full"
                  />
                </button>
                <span className="pointer-events-none absolute bottom-3.5 right-3.5 inline-flex items-center gap-2 rounded-[10px] bg-navy-900/80 px-3 py-2 text-[13px] font-semibold text-white">
                  <Expand className="size-4" aria-hidden /> {active + 1} / {images.length}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                {images.map((img, i) => (
                  <button
                    key={img.filePath}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`${t('vehicle.photo')}: ${t(`gallery.${img.tag ?? 'gallery'}`)}`}
                    aria-current={i === active}
                    className={cn(
                      'relative aspect-[4/3] overflow-hidden rounded-xl border-2 bg-surface transition-colors',
                      i === active ? 'border-brand-600' : 'border-white/8 hover:border-white/25',
                    )}
                  >
                    <VehicleImage filePath={img.filePath} alt="" preset="thumb" fit="cover" className="h-full w-full" />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-navy-900/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {t(`gallery.${img.tag ?? 'gallery'}`)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Features */}
          {vehicle.features.length > 0 && (
            <section>
              <h2 className="text-[28px] font-extrabold">{t('vehicle.features')}</h2>
              <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {vehicle.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-surface p-4">
                    <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-brand-600/12 text-brand-400">
                      <Check className="size-[18px]" aria-hidden />
                    </span>
                    <span className="text-[15px] font-semibold text-white">{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Specs */}
          <section>
            <h2 className="text-[28px] font-extrabold">{t('vehicle.specs')}</h2>
            <dl className="m-0 mt-4 grid grid-cols-1 overflow-hidden rounded-2xl border border-white/8 sm:grid-cols-2">
              {specRows.map((r) => (
                <div key={r.k} className="flex justify-between gap-3 border-b border-white/6 bg-inset px-[18px] py-3.5">
                  <dt className="text-ink-400">{r.k}</dt>
                  <dd className="m-0 text-right font-semibold text-white">{r.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Reviews */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[28px] font-extrabold">{t('vehicle.reviews')}</h2>
              <div className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-1.5 font-bold text-white">
                <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                {avgRating || '—'} <span className="font-medium text-ink-400">· {reviewCount}</span>
              </div>
            </div>

            {!user ? (
              <div className="mt-5 rounded-2xl border border-white/8 bg-inset px-5 py-4 text-[14px] text-ink-500">
                <Link to="/login" className="font-bold text-brand-400 hover:underline">{t('common.login')}</Link> {t('vehicle.loginToReview')}
              </div>
            ) : canReview ? (
              <div className="mt-5 rounded-2xl border border-white/8 bg-surface p-5">
                <h3 className="flex items-center gap-2 text-[15px] font-bold"><MessageSquare className="size-4 text-brand-400" aria-hidden /> {t('vehicle.writeReview')}</h3>
                {reviewError && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">{reviewError}</div>}
                <div className="mt-3"><StarInput value={rating} onChange={setRating} /></div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('vehicle.reviewPlaceholder')} rows={3}
                  className="mt-3 w-full rounded-xl border border-white/12 bg-inset px-4 py-3 text-[15px] text-white placeholder:text-ink-400 focus:border-brand-400 focus:outline-none" />
                <button type="button" onClick={submitReview} disabled={posting}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[14px] font-bold text-white hover:bg-brand-hover disabled:opacity-60">
                  {posting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : t('vehicle.submitReview')}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/8 bg-inset px-5 py-4 text-[14px] text-ink-500">
                {t('vehicle.rentToReview')}
              </div>
            )}

            <div className="mt-6 space-y-4">
              {reviewsLoaded && reviews.length === 0 && (
                <p className="text-[14px] text-ink-400">{t('vehicle.noReviews')}</p>
              )}
              {reviews.map((r) => (
                <div key={r.id} className="border-t border-white/8 pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white">{r.reviewer}</div>
                    <div className="text-[12px] text-ink-400">
                      {new Date(r.createdAt).toLocaleDateString(locale === 'so' ? 'so' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="mt-1"><Stars value={r.rating} /></div>
                  {r.comment && <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Booking panel */}
        <aside aria-label={t('vehicle.bookThis')} className="w-full flex-[1_1_340px] lg:sticky lg:top-24 lg:max-w-[420px]">
          <div className="flex flex-col gap-4 rounded-[22px] border border-white/10 bg-surface p-6 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[40px] font-extrabold text-white">{money(vehicle.pricePerDay)}</span>
              <span className="text-ink-400">{t('common.perDay')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-500">
                {t('booking.pickupDate')}
                <input type="date" min={today} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
                  className="rounded-xl border border-white/12 bg-inset p-3 text-[15px] font-semibold text-white focus:border-brand-400 focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-500">
                {t('booking.returnDate')}
                <input type="date" min={pickupDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                  className="rounded-xl border border-white/12 bg-inset p-3 text-[15px] font-semibold text-white focus:border-brand-400 focus:outline-none" />
              </label>
            </div>
            {available !== null && (
              <div
                role="status"
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold',
                  available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300',
                )}
              >
                <Check className="size-4" aria-hidden /> {available ? t('vehicle.datesFree') : t('vehicle.datesTaken')}
              </div>
            )}
            {days > 0 && (
              <dl className="m-0 flex flex-col gap-2.5 text-[15px]">
                <div className="flex justify-between"><dt className="text-ink-500">{money(vehicle.pricePerDay)} × {days} {days > 1 ? t('booking.days') : t('booking.day')}</dt><dd className="m-0 text-white">{money(carTotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">{t('booking.tax')}</dt><dd className="m-0 text-white">{money(tax)}</dd></div>
                <div className="flex justify-between border-t border-white/8 pt-3 text-lg font-extrabold"><dt className="text-white">{t('booking.total')}</dt><dd className="m-0 font-display text-2xl text-white">{money(carTotal + tax)}</dd></div>
              </dl>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <PriceTile label={t('vehicle.weekly')} value={vehicle.pricePerWeek} />
              <PriceTile label={t('vehicle.monthly')} value={vehicle.pricePerMonth} />
            </div>
            <ButtonLink to={bookingHref} size="lg" className="w-full">
              {t('vehicle.continue')} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <p className="text-center text-[13px] text-ink-400">{t('vehicle.noChargeYet')}</p>
          </div>

          <div className="mt-4 rounded-[22px] border border-white/8 bg-surface p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold">
              <CalendarDays className="size-4 text-brand-400" aria-hidden /> {t('vehicle.availability')}
            </h2>
            <MonthCalendar ranges={calendar} />
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 pb-20 sm:px-6">
          <h2 className="mb-7 text-3xl font-extrabold">{t('vehicle.related')}</h2>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {related.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} />
            ))}
          </div>
        </section>
      )}

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

function SpecCell({ icon: Icon, label, value, unit, big }: { icon?: React.ElementType; label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-white/8 py-5 pr-4 [&:not(:first-child)]:md:border-l md:pl-5">
      <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-ink-400">
        {Icon && <Icon className="size-4 text-brand-400" aria-hidden />} {label}
      </dt>
      <dd className={cn('m-0 font-display tabular-nums', big ? 'text-[40px] font-extrabold leading-none text-brand-500 sm:text-[48px]' : 'text-xl font-bold text-white')}>
        {value} {unit && <span className="text-sm font-medium text-ink-500">{unit}</span>}
      </dd>
    </div>
  );
}

function PriceTile({ label, value }: { label: string; value: number }) {
  const { money } = useCurrency();
  return (
    <div className="rounded-xl border border-white/8 bg-inset p-3 text-center">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      <div className="font-display text-lg font-extrabold text-white">{money(value)}</div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={'size-4 ' + (n <= value ? 'fill-amber-500 text-amber-500' : 'text-white/15')} />
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} / 5`}>
          <Star className={'size-7 transition ' + (n <= value ? 'fill-amber-500 text-amber-500' : 'text-white/15 hover:text-amber-300')} />
        </button>
      ))}
    </div>
  );
}
