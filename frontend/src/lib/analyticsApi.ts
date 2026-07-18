import { http } from './http';

export interface AnalyticsSummary {
  totalRevenue: number;
  bookingsCount: number;
  activeBookings: number;
  completedBookings: number;
  cancelledCount: number;
  avgBookingValue: number;
  occupancyRate: number;
  newCustomers: number;
  deltas: {
    totalRevenue: number | null;
    bookingsCount: number | null;
    avgBookingValue: number | null;
    occupancyRate: number | null;
    newCustomers: number | null;
  };
}

export interface TimeseriesPoint {
  period: string;
  revenue: number;
  bookings: number;
}

export interface TopVehicle {
  vehicleId: string;
  title: string;
  revenue?: number;
  bookings: number;
}

export interface StatusSlice {
  status: string;
  count: number;
}

export type Granularity = 'day' | 'week' | 'month';
export type RangeParams = { from?: string; to?: string; granularity?: Granularity; limit?: number };

function qs(p: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
}

export const analyticsApi = {
  summary: (p: RangeParams) => http<{ data: AnalyticsSummary }>(`/analytics/summary${qs({ from: p.from, to: p.to })}`),
  revenueTimeseries: (p: RangeParams) =>
    http<{ data: TimeseriesPoint[] }>(`/analytics/revenue-timeseries${qs({ from: p.from, to: p.to, granularity: p.granularity })}`),
  topVehicles: (p: RangeParams) =>
    http<{ data: { byRevenue: TopVehicle[]; byBookings: TopVehicle[] } }>(`/analytics/top-vehicles${qs({ from: p.from, to: p.to, limit: p.limit })}`),
  statusBreakdown: (p: RangeParams) => http<{ data: StatusSlice[] }>(`/analytics/status-breakdown${qs({ from: p.from, to: p.to })}`),
};
