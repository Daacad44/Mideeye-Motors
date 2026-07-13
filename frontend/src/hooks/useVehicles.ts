import { useEffect, useState } from 'react';
import type { Vehicle } from '@/types/vehicle';
import { api } from '@/lib/api';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.listVehicles().then((v) => {
      if (active) {
        setVehicles(v);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { vehicles, loading };
}

export function useVehicle(slug: string | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    api.getVehicle(slug).then((v) => {
      if (active) {
        setVehicle(v);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [slug]);

  return { vehicle, loading };
}
