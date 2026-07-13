import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Vehicle } from '@/types/vehicle';
import { api } from '@/lib/api';
import { VehicleCard } from '../VehicleCard';
import { SectionHeading } from '../ui/SectionHeading';

export function Featured() {
  const [cars, setCars] = useState<Vehicle[]>([]);

  useEffect(() => {
    api.featured().then((v) => setCars(v.slice(0, 4)));
  }, []);

  return (
    <section className="mx-auto max-w-[1360px] px-5 py-20 lg:px-8 lg:py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Our Fleet" title="Featured" highlight="Vehicles" />
        <Link
          to="/fleet"
          className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-bold text-navy-700 transition-colors hover:border-brand-400 hover:text-brand-600"
        >
          View All Cars <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cars.map((v, i) => (
          <VehicleCard key={v.id} vehicle={v} index={i} />
        ))}
      </div>
    </section>
  );
}
