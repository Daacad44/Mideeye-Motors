import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DollarSign, CalendarCheck, Gauge, TrendingUp, UserPlus, Download, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  analyticsApi, type AnalyticsSummary, type TimeseriesPoint, type TopVehicle, type StatusSlice, type Granularity,
} from '@/lib/analyticsApi';
import { reportsApi } from '@/lib/reportsApi';
import { formatCurrency } from '@/lib/cn';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

function presetRange(preset: PresetId, custom: { from: string; to: string }): { from: Date; to: Date } {
  const to = new Date(); to.setHours(23, 59, 59, 999);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today': return { from: start, to };
    case '7d': { const f = new Date(start); f.setDate(f.getDate() - 6); return { from: f, to }; }
    case '30d': { const f = new Date(start); f.setDate(f.getDate() - 29); return { from: f, to }; }
    case 'month': return { from: new Date(to.getFullYear(), to.getMonth(), 1), to };
    case 'year': return { from: new Date(to.getFullYear(), 0, 1), to };
    case 'custom':
      return {
        from: custom.from ? new Date(`${custom.from}T00:00:00`) : start,
        to: custom.to ? new Date(`${custom.to}T23:59:59`) : to,
      };
  }
}

const cssVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

const fmtPeriod = (p: string) => {
  const d = new Date(p);
  return Number.isNaN(d.getTime()) ? p : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

export function AnalyticsPanel() {
  const [preset, setPreset] = useState<PresetId>('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [granularity, setGranularity] = useState<Granularity>('day');

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [top, setTop] = useState<TopVehicle[]>([]);
  const [status, setStatus] = useState<StatusSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => presetRange(preset, custom), [preset, custom]);
  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  const colors = useMemo(() => ({
    brand600: cssVar('--color-brand-600', '#0b67c2'),
    brand500: cssVar('--color-brand-500', '#18a8f5'),
    brand300: cssVar('--color-brand-300', '#7cc9ff'),
    amber500: cssVar('--color-amber-500', '#f59e0b'),
    navy700: cssVar('--color-navy-700', '#143a68'),
    line: cssVar('--color-line', '#e6edf5'),
    ink400: cssVar('--color-ink-400', '#7a8aa0'),
  }), []);

  const statusColors: Record<string, string> = {
    PENDING: colors.amber500,
    CONFIRMED: colors.brand600,
    ACTIVE: colors.brand500,
    COMPLETED: colors.brand300,
    CANCELLED: colors.ink400,
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const p = { from: fromISO, to: toISO };
    Promise.all([
      analyticsApi.summary(p),
      analyticsApi.revenueTimeseries({ ...p, granularity }),
      analyticsApi.topVehicles({ ...p, limit: 6 }),
      analyticsApi.statusBreakdown(p),
    ])
      .then(([s, ts, tv, sb]) => {
        if (!alive) return;
        setSummary(s.data);
        setSeries(ts.data);
        setTop(tv.data.byRevenue);
        setStatus(sb.data);
      })
      .catch((e) => { if (alive) setError((e as Error).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [fromISO, toISO, granularity]);

  const statusTotal = status.reduce((s, x) => s + x.count, 0);
  const hasRevenue = series.some((p) => p.revenue > 0);

  const kpis = summary
    ? [
        { icon: DollarSign, label: 'Revenue', value: formatCurrency(summary.totalRevenue), delta: summary.deltas.totalRevenue },
        { icon: CalendarCheck, label: 'Bookings', value: String(summary.bookingsCount), delta: summary.deltas.bookingsCount },
        { icon: Gauge, label: 'Occupancy', value: `${summary.occupancyRate}%`, delta: summary.deltas.occupancyRate },
        { icon: TrendingUp, label: 'Avg value', value: formatCurrency(summary.avgBookingValue), delta: summary.deltas.avgBookingValue },
        { icon: UserPlus, label: 'New customers', value: String(summary.newCustomers), delta: summary.deltas.newCustomers },
      ]
    : [];

  const exportBookings = () => reportsApi.bookingsCsv({ from: fromISO, to: toISO }).catch((e) => setError((e as Error).message));
  const exportRevenue = () => reportsApi.revenueCsv({ from: fromISO, to: toISO, granularity }).catch((e) => setError((e as Error).message));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => setPreset(p.id)}
              className={'rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ' + (preset === p.id ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-200')}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })}
              className="rounded-xl border border-line px-3 py-1.5 text-[13px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none" />
            <span className="text-ink-400">–</span>
            <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })}
              className="rounded-xl border border-line px-3 py-1.5 text-[13px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none" />
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={exportBookings} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-bold text-navy-700 hover:border-brand-400 hover:text-brand-600">
            <Download className="size-4" /> Bookings CSV
          </button>
          <button onClick={exportRevenue} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-bold text-navy-700 hover:border-brand-400 hover:text-brand-600">
            <Download className="size-4" /> Revenue CSV
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-600">{error}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading && !summary
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[116px] animate-pulse rounded-3xl border border-line bg-white" />)
          : kpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      {/* Revenue over time */}
      <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-navy-700">Revenue over time</h3>
          <div className="flex gap-1 rounded-lg border border-line p-0.5">
            {(['day', 'week', 'month'] as Granularity[]).map((g) => (
              <button key={g} onClick={() => setGranularity(g)}
                className={'rounded-md px-2.5 py-1 text-[12px] font-bold capitalize transition-colors ' + (granularity === g ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-200')}>
                {g}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-[280px] animate-pulse rounded-2xl bg-mist-100" />
        ) : hasRevenue ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.brand500} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={colors.brand500} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.line} vertical={false} />
              <XAxis dataKey="period" tickFormatter={fmtPeriod} tick={{ fontSize: 12, fill: colors.ink400 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 12, fill: colors.ink400 }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} labelFormatter={(l) => fmtPeriod(String(l))} />
              <Area type="monotone" dataKey="revenue" stroke={colors.brand600} strokeWidth={2} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Top vehicles + status donut */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-700">Top vehicles by revenue</h3>
          {loading ? (
            <div className="h-[280px] animate-pulse rounded-2xl bg-mist-100" />
          ) : top.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 12, fill: colors.navy700 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} />
                <Bar dataKey="revenue" fill={colors.brand500} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-700">Bookings by status</h3>
          {loading ? (
            <div className="h-[260px] animate-pulse rounded-2xl bg-mist-100" />
          ) : statusTotal > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={status.filter((s) => s.count > 0)} dataKey="count" nameKey="status" innerRadius={60} outerRadius={92} paddingAngle={2}>
                  {status.filter((s) => s.count > 0).map((s) => <Cell key={s.status} fill={statusColors[s.status] ?? colors.ink400} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, delta }: { icon: React.ElementType; label: string; value: string; delta: number | null }) {
  const up = delta != null && delta >= 0;
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <Icon className="size-6 text-brand-500" />
        {delta != null && (
          <span className={'inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[12px] font-bold ' + (up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold text-navy-700">{value}</div>
      <div className="text-[13px] text-ink-400">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid h-[240px] place-items-center text-center">
      <div>
        <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-mist-200 text-ink-400"><TrendingUp className="size-6" /></div>
        <p className="text-[14px] font-medium text-ink-400">No data for this period yet.</p>
      </div>
    </div>
  );
}
