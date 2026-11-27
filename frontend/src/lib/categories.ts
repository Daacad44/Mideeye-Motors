import { Car, CarFront, Crown, Truck, Zap, Bus, type LucideIcon } from 'lucide-react';
import type { VehicleCategory } from '@/types/vehicle';

/** Vehicle categories with their label + one-line hint keys and icon. */
export const CATEGORIES: { id: VehicleCategory; key: string; hint: string; icon: LucideIcon }[] = [
  { id: 'SUV', key: 'categories.suv', hint: 'categories.suvHint', icon: Car },
  { id: 'Sedan', key: 'categories.sedan', hint: 'categories.sedanHint', icon: CarFront },
  { id: 'Luxury', key: 'categories.luxury', hint: 'categories.luxuryHint', icon: Crown },
  { id: 'Pickup', key: 'categories.pickup', hint: 'categories.pickupHint', icon: Truck },
  { id: 'Electric', key: 'categories.electric', hint: 'categories.electricHint', icon: Zap },
  { id: 'Van', key: 'categories.van', hint: 'categories.vanHint', icon: Bus },
];

export const categoryKey = (id: string) => CATEGORIES.find((c) => c.id === id)?.key;
