import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, Search } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { VehicleCard } from '@/components/VehicleCard';
import type { VehicleCategory } from '@/types/vehicle';

const categories: (VehicleCategory | 'All')[] = [
  'All',
  'SUV',
  'Sedan',
  'Luxury',
  'Pickup',
  'Electric',
  'Van',
];

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating';

export default function Fleet() {
  const { vehicles, loading } = useVehicles();
  const [params] = useSearchParams();
  const [active, setActive] = useState<VehicleCategory | 'All'>(
    (params.get('type') as VehicleCategory) || 'All',
  );
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('featured');

  const filtered = useMemo(() => {
    let list = vehicles.filter((v) => {
      const matchCat = active === 'All' || v.category === active;
      const matchQuery =
        !query ||
        `${v.title} ${v.brand} ${v.category}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.pricePerDay - b.pricePerDay;
        case 'price-desc':
          return b.pricePerDay - a.pricePerDay;
        case 'rating':
          return b.rating - a.rating;
        default:
          return Number(b.featured) - Number(a.featured);
      }
    });
    return list;
  }, [vehicles, active, query, sort]);

  return (
    <div className="bg-mist-100">
      {/* Header band */}
      <section className="relative overflow-hidden bg-[linear-gradient(118deg,#061423,#0d2b50_60%,#0b67c2)]">
        <div className="pointer-events-none absolute inset-0 dotted-grid opacity-50" />
        <div className="pointer-events-none absolute -right-16 -top-28 size-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative mx-auto max-w-[1360px] px-5 py-16 lg:px-8">
          <nav className="mb-3 text-[13px] font-semibold text-brand-300">
            <Link to="/" className="hover:text-white">Home</Link> / Fleet
          </nav>
          <h1 className="font-display text-4xl font-extrabold text-white lg:text-[46px]">
            Explore Our Fleet
          </h1>
          <p className="mt-3 max-w-lg text-[17px] text-brand-100/80">
            {vehicles.length} premium vehicles, meticulously maintained and ready
            for the road.
          </p>
        </div>
      </section>

      {/* Controls */}
      <section className="mx-auto max-w-[1360px] px-5 py-8 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={
                  'rounded-xl px-4 py-2 text-sm font-bold transition-colors ' +
                  (active === c
                    ? 'bg-brand-600 text-white'
                    : 'bg-mist-200 text-navy-700 hover:bg-brand-100')
                }
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center gap-3 lg:max-w-md">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-line px-3.5 py-2.5">
              <Search className="size-4 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vehicles…"
                className="w-full bg-transparent text-sm font-medium text-navy-700 focus:outline-none"
              />
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5">
              <SlidersHorizontal className="size-4 text-ink-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-transparent text-sm font-bold text-navy-700 focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="rating">Top rated</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-[1360px] px-5 pb-24 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-[420px] rounded-3xl" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-white py-24 text-center">
            <p className="font-display text-xl font-bold text-navy-700">
              No vehicles match your search
            </p>
            <p className="mt-2 text-ink-400">Try a different category or keyword.</p>
          </div>
        )}
      </section>
    </div>
  );
}
