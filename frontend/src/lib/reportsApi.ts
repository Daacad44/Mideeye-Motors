import { downloadAuthed } from './http';

function qs(p: Record<string, string | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) s.set(k, v);
  const str = s.toString();
  return str ? `?${str}` : '';
}

export const reportsApi = {
  bookingsCsv: (p: { from?: string; to?: string; status?: string }) =>
    downloadAuthed(`/reports/bookings.csv${qs(p)}`, 'bookings.csv'),
  revenueCsv: (p: { from?: string; to?: string; granularity?: string }) =>
    downloadAuthed(`/reports/revenue.csv${qs(p)}`, 'revenue.csv'),
};
