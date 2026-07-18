import { useEffect, useMemo, useState } from 'react';
import {
  Car, Star, CheckCircle2, DollarSign, Image as ImageIcon,
  Upload, Trash2, ArrowUp, ArrowDown, Crown, LayoutTemplate, X, Images, Users, ScrollText, LogOut, Lock, Plus,
} from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { ik } from '@/lib/imagekitImages';
import { vehiclesApi } from '@/lib/vehiclesApi';
import { formatCurrency } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { MediaManager } from '@/components/admin/MediaManager';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { AuditPanel } from '@/components/admin/AuditPanel';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import type { Vehicle, VehicleGalleryImage } from '@/types/vehicle';

type Tab = 'fleet' | 'media' | 'users' | 'audit';

export default function Admin() {
  const { user, loading, isStaff, hasRole, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('media');

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-mist-100"><span className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600" /></div>;
  }

  if (!isStaff) {
    return (
      <div className="grid min-h-screen place-items-center bg-mist-100 px-5 text-center">
        <div className="max-w-md rounded-3xl border border-line bg-white p-10 shadow-[var(--shadow-soft)]">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600"><Lock className="size-7" /></span>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-navy-700">Admin access required</h1>
          <p className="mt-2 text-ink-500">Sign in with a staff, manager, admin or super-admin account to reach the dashboard.</p>
          <ButtonLink to="/login" variant="secondary" className="mt-6">Sign in</ButtonLink>
        </div>
      </div>
    );
  }

  const isAdmin = hasRole('SUPER_ADMIN', 'ADMIN');
  const allTabs: { id: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'media', label: 'Media Library', icon: Images, show: true },
    { id: 'fleet', label: 'Fleet', icon: Car, show: true },
    { id: 'users', label: 'Team & Roles', icon: Users, show: isAdmin },
    { id: 'audit', label: 'Audit Log', icon: ScrollText, show: isAdmin },
  ];
  const tabs = allTabs.filter((t) => t.show);

  const activeTab = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <div className="min-h-screen bg-mist-100 lg:flex">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-navy-950 lg:flex">
        <div className="flex h-20 items-center gap-2 border-b border-white/5 px-5">
          <Logo variant="light" height={44} />
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ' +
                (tab === t.id
                  ? 'bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgba(11,103,194,0.8)]'
                  : 'text-brand-100/60 hover:bg-white/5 hover:text-white')
              }
            >
              <t.icon className="size-[18px]" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="mb-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="truncate text-[12.5px] font-bold text-white">{user?.name || user?.email}</div>
            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-brand-300">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-[13px] font-bold text-white hover:bg-white/10"
          >
            <LogOut className="size-4" /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="min-w-0 flex-1">
        {/* Top bar (mobile logo + role; desktop page title) */}
        <header className="sticky top-0 z-20 border-b border-line bg-white/80 backdrop-blur">
          <div className="flex items-center gap-3 px-5 py-4 lg:px-8">
            <div className="lg:hidden">
              <Logo height={40} />
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <activeTab.icon className="size-5 text-brand-600" />
              <h1 className="font-display text-lg font-extrabold text-navy-700">{activeTab.label}</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden rounded-full bg-mist-200 px-3 py-1.5 text-[12.5px] font-semibold text-navy-700 sm:inline lg:hidden">
                {user?.role}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-xl bg-mist-200 px-3 py-1.5 text-[13px] font-bold text-navy-700 hover:bg-brand-100 lg:hidden"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </div>
          </div>

          {/* Mobile tab strip */}
          <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ' +
                  (tab === t.id ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-200')
                }
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-[1360px] px-5 py-8 lg:px-8">
          {tab === 'media' && <MediaManager />}
          {tab === 'fleet' && <FleetPanel />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'audit' && <AuditPanel />}
        </main>
      </div>
    </div>
  );
}

/* ── Fleet management (pricing / featured / availability / per-vehicle gallery) ── */
function FleetPanel() {
  const { vehicles: initial } = useVehicles();
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [managing, setManaging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setFleet(initial), [initial]);
  const patchLocal = (id: string, p: Partial<Vehicle>) => setFleet((f) => f.map((v) => (v.id === id ? { ...v, ...p } : v)));

  const patchPricing = async (id: string, pricePerDay: number) => {
    patchLocal(id, { pricePerDay });
    try {
      await vehiclesApi.patch(id, { pricePerDay });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggle = async (id: string, field: 'featured' | 'availability', value: boolean) => {
    patchLocal(id, { [field]: value } as Partial<Vehicle>);
    try {
      await vehiclesApi.patch(id, { [field]: value });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const kpis = useMemo(() => [
    { icon: Car, label: 'Total vehicles', value: fleet.length },
    { icon: Star, label: 'Featured', value: fleet.filter((v) => v.featured).length },
    { icon: CheckCircle2, label: 'Available', value: fleet.filter((v) => v.availability).length },
    { icon: DollarSign, label: 'Avg / day', value: fleet.length ? formatCurrency(Math.round(fleet.reduce((s, v) => s + v.pricePerDay, 0) / fleet.length)) : '—' },
  ], [fleet]);

  const active = fleet.find((v) => v.id === managing);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
            <k.icon className="size-6 text-brand-500" />
            <div className="mt-3 font-display text-3xl font-extrabold text-navy-700">{k.value}</div>
            <div className="text-[13px] text-ink-400">{k.label}</div>
          </div>
        ))}
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-600">{error}</div>}

      <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 font-display text-lg font-bold text-navy-700">Manage fleet</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[12px] font-bold uppercase tracking-wide text-ink-400">
                <th className="pb-3">Vehicle</th><th className="pb-3">Price / day</th>
                <th className="pb-3 text-center">Featured</th><th className="pb-3 text-center">Available</th><th className="pb-3 text-right">Media</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((v) => (
                <tr key={v.id} className="border-b border-line/70 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-mist-200">
                        <VehicleImage filePath={v.thumbnail?.filePath} alt={v.thumbnail?.alt || v.title} preset="thumb" fit="contain" className="h-full w-full" />
                      </div>
                      <div><div className="font-bold text-navy-700">{v.title}</div><div className="text-[12px] text-ink-400">{v.category} · {v.brand}</div></div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="inline-flex items-center rounded-lg border border-line px-2">
                      <span className="text-ink-400">$</span>
                      <input type="number" value={v.pricePerDay} onChange={(e) => patchPricing(v.id, Number(e.target.value))}
                        className="w-16 bg-transparent py-1.5 font-bold text-navy-700 focus:outline-none" />
                    </div>
                  </td>
                  <td className="py-3 text-center"><Toggle on={v.featured} onClick={() => toggle(v.id, 'featured', !v.featured)} /></td>
                  <td className="py-3 text-center"><Toggle on={v.availability} onClick={() => toggle(v.id, 'availability', !v.availability)} /></td>
                  <td className="py-3 text-right">
                    <button onClick={() => setManaging(v.id)} className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px] font-bold text-navy-700 hover:border-brand-400 hover:text-brand-600">
                      <ImageIcon className="size-4" /> {v.gallery.length} images
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {active && (
        <ImageManager
          vehicle={active}
          onClose={() => setManaging(null)}
          onChange={(p) => patchLocal(active.id, p)}
        />
      )}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={'relative h-6 w-11 rounded-full transition-colors ' + (on ? 'bg-brand-600' : 'bg-mist-200')}>
      <span className={'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ' + (on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/**
 * Per-vehicle gallery editor. Images are attached by pasting a MediaImage
 * `id` (visible + copyable on each card in the Media Library tab) — upload
 * the real photo there first, then attach it here. Every action here calls
 * the real vehicles API (PATCH hero/cover/thumbnail, PUT gallery), so
 * changes are persisted immediately, not just local UI state.
 */
function ImageManager({ vehicle, onClose, onChange }: { vehicle: Vehicle; onClose: () => void; onChange: (p: Partial<Vehicle>) => void }) {
  // `vehicle.gallery` (the prop) is the single source of truth — never
  // duplicated into local state. Each mutation below computes the next
  // array, persists it, then applies the SERVER'S response (which resolves
  // pasted MediaImage ids to real ImageKit filePaths) via `onChange`, so
  // the UI always reflects what's actually saved, not an optimistic guess.
  const gallery = vehicle.gallery;
  const [addId, setAddId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistGallery = async (slots: { mediaImageId: string; alt?: string; tag?: string; isHero?: boolean; isCover?: boolean }[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await vehiclesApi.putGallery(vehicle.id, slots);
      onChange({ gallery: res.data.gallery });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toSlots = (g: VehicleGalleryImage[]) =>
    g.map((img) => ({ mediaImageId: img.filePath, alt: img.alt, tag: img.tag, isHero: img.isHero, isCover: img.isCover }));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= gallery.length) return;
    const g = [...gallery];
    [g[i], g[j]] = [g[j], g[i]];
    persistGallery(toSlots(g));
  };

  const remove = (i: number) => persistGallery(toSlots(gallery.filter((_, idx) => idx !== i)));

  const addImage = () => {
    if (!addId.trim()) return;
    persistGallery([...toSlots(gallery), { mediaImageId: addId.trim(), alt: vehicle.title, tag: 'gallery' }]);
    setAddId('');
  };

  const setField = async (field: 'heroImageId' | 'coverImageId' | 'thumbnailId', mediaImageId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await vehiclesApi.patch(vehicle.id, { [field]: mediaImageId });
      onChange(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-navy-950/60 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-navy-700">{vehicle.title}</h3>
            <p className="text-[13px] text-ink-400">{busy ? 'Saving…' : 'ImageKit'}</p>
          </div>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-mist-200 text-navy-700 hover:bg-brand-100"><X className="size-5" /></button>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-100/60 p-4 text-[13px] text-navy-700">
          <Upload className="size-8 shrink-0 text-brand-600" />
          <span>Upload the real photo in the <b>Media Library</b> tab, copy its <b>image ID</b>, then paste it below to attach it here.</span>
        </div>

        <div className="mt-4 flex gap-2">
          <input value={addId} onChange={(e) => setAddId(e.target.value)} placeholder="Paste MediaImage ID to add to gallery…"
            className="flex-1 rounded-xl border border-line px-3 py-2.5 text-[13px] font-mono text-navy-700 focus:border-brand-400 focus:outline-none" />
          <button onClick={addImage} disabled={busy || !addId.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-navy-700 disabled:opacity-50">
            <Plus className="size-4" /> Add
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-[13px]">
          <ImageSlot label="Hero" icon={Crown} image={vehicle.heroImage} onSet={(id) => setField('heroImageId', id)} />
          <ImageSlot label="Cover" icon={LayoutTemplate} image={vehicle.coverImage} onSet={(id) => setField('coverImageId', id)} />
          <ImageSlot label="Thumbnail" icon={ImageIcon} image={vehicle.thumbnail} onSet={(id) => setField('thumbnailId', id)} />
        </div>

        <div className="mt-6 space-y-3">
          <h4 className="font-bold text-navy-700">Gallery ({gallery.length})</h4>
          {gallery.map((img, i) => (
            <div key={img.filePath + i} className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
              <img src={ik(img.filePath, 'thumb')} alt={img.alt}
                className="h-14 w-20 shrink-0 rounded-lg bg-mist-200 object-cover" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-navy-700">{img.tag ?? 'image'}</div>
                <code className="block truncate text-[11px] text-ink-400">{img.filePath}</code>
              </div>
              <div className="flex shrink-0 gap-1">
                <IB onClick={() => move(i, -1)} title="Up"><ArrowUp className="size-4" /></IB>
                <IB onClick={() => move(i, 1)} title="Down"><ArrowDown className="size-4" /></IB>
                <IB onClick={() => remove(i)} title="Delete" danger><Trash2 className="size-4" /></IB>
              </div>
            </div>
          ))}
          {gallery.length === 0 && <p className="text-center text-[13px] text-ink-400">No gallery images yet.</p>}
        </div>
      </div>
    </div>
  );
}

function ImageSlot({ label, icon: Icon, image, onSet }: { label: string; icon: React.ElementType; image: Vehicle['heroImage']; onSet: (mediaImageId: string) => void }) {
  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="mb-2 flex items-center gap-2 font-bold text-navy-700"><Icon className="size-4 text-brand-500" /> {label}</div>
      <div className="mb-2 aspect-video overflow-hidden rounded-lg bg-mist-200">
        {image ? <img src={ik(image.filePath, 'card')} alt={image.alt} className="h-full w-full object-cover" /> : null}
      </div>
      <button
        onClick={() => {
          const id = window.prompt(`Paste MediaImage ID to set as ${label.toLowerCase()}:`);
          if (id?.trim()) onSet(id.trim());
        }}
        className="w-full rounded-lg border border-line px-2 py-1.5 text-[12px] font-bold text-navy-700 hover:border-brand-400 hover:text-brand-600"
      >
        Set {label.toLowerCase()}
      </button>
    </div>
  );
}

function IB({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={'grid size-8 place-items-center rounded-lg border border-line transition-colors ' + (danger ? 'text-red-500 hover:border-red-300 hover:bg-red-50' : 'text-navy-700 hover:border-brand-400 hover:text-brand-600')}>
      {children}
    </button>
  );
}
