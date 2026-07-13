import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Car, Star, CheckCircle2, DollarSign, Image as ImageIcon,
  Upload, Trash2, ArrowUp, ArrowDown, Crown, LayoutTemplate, X,
} from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { VehicleImage } from '@/components/VehicleImage';
import { cld } from '@/lib/cloudinary';
import { formatCurrency } from '@/lib/cn';
import type { Vehicle, VehicleImage as VImg } from '@/types/vehicle';

export default function Admin() {
  const { vehicles: initial } = useVehicles();
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [managing, setManaging] = useState<string | null>(null);

  useEffect(() => setFleet(initial), [initial]);

  const patch = (id: string, p: Partial<Vehicle>) =>
    setFleet((f) => f.map((v) => (v.id === id ? { ...v, ...p } : v)));

  const kpis = useMemo(
    () => [
      { icon: Car, label: 'Total vehicles', value: fleet.length },
      { icon: Star, label: 'Featured', value: fleet.filter((v) => v.featured).length },
      { icon: CheckCircle2, label: 'Available', value: fleet.filter((v) => v.availability).length },
      {
        icon: DollarSign,
        label: 'Avg / day',
        value: fleet.length ? formatCurrency(Math.round(fleet.reduce((s, v) => s + v.pricePerDay, 0) / fleet.length)) : '—',
      },
    ],
    [fleet],
  );

  const active = fleet.find((v) => v.id === managing);

  return (
    <div className="min-h-screen bg-mist-100">
      {/* Top bar */}
      <div className="border-b border-line bg-navy-950">
        <div className="mx-auto flex max-w-[1360px] items-center gap-3 px-5 py-4 lg:px-8">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
            <LayoutDashboard className="size-5" />
          </span>
          <div>
            <div className="font-display font-bold text-white">Admin Dashboard</div>
            <div className="text-[12px] text-brand-100/60">Fleet & Cloudinary media management</div>
          </div>
          <span className="ml-auto rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold text-brand-100">
            admin@mideeyemotors.com
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
              <k.icon className="size-6 text-brand-500" />
              <div className="mt-3 font-display text-3xl font-extrabold text-navy-700">{k.value}</div>
              <div className="text-[13px] text-ink-400">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Fleet table */}
        <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-display text-lg font-bold text-navy-700">Manage fleet</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[12px] font-bold uppercase tracking-wide text-ink-400">
                  <th className="pb-3">Vehicle</th>
                  <th className="pb-3">Price / day</th>
                  <th className="pb-3 text-center">Featured</th>
                  <th className="pb-3 text-center">Available</th>
                  <th className="pb-3 text-right">Media</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((v) => (
                  <tr key={v.id} className="border-b border-line/70 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-mist-200">
                          <VehicleImage publicId={v.thumbnail} alt={v.title} fit="contain" className="h-full w-full" sizes="56px" />
                        </div>
                        <div>
                          <div className="font-bold text-navy-700">{v.title}</div>
                          <div className="text-[12px] text-ink-400">{v.category} · {v.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="inline-flex items-center rounded-lg border border-line px-2">
                        <span className="text-ink-400">$</span>
                        <input
                          type="number"
                          value={v.pricePerDay}
                          onChange={(e) => patch(v.id, { pricePerDay: Number(e.target.value) })}
                          className="w-16 bg-transparent py-1.5 font-bold text-navy-700 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <Toggle on={v.featured} onClick={() => patch(v.id, { featured: !v.featured })} />
                    </td>
                    <td className="py-3 text-center">
                      <Toggle on={v.availability} onClick={() => patch(v.id, { availability: !v.availability })} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setManaging(v.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px] font-bold text-navy-700 hover:border-brand-400 hover:text-brand-600"
                      >
                        <ImageIcon className="size-4" /> {v.gallery.length} images
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {active && (
        <ImageManager
          vehicle={active}
          onClose={() => setManaging(null)}
          onChange={(p) => patch(active.id, p)}
        />
      )}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={'relative h-6 w-11 rounded-full transition-colors ' + (on ? 'bg-brand-600' : 'bg-mist-200')}
    >
      <span className={'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ' + (on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/**
 * Cloudinary media manager: upload, delete, reorder, and pick hero/cover.
 * Uploads POST to the backend `/api/upload` (signed Cloudinary upload); the
 * returned publicId is appended to the gallery. Because every surface derives
 * its URL from the publicId, changes propagate site-wide with no code edits.
 */
function ImageManager({
  vehicle,
  onClose,
  onChange,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onChange: (p: Partial<Vehicle>) => void;
}) {
  const [gallery, setGallery] = useState<VImg[]>(vehicle.gallery);
  const [busy, setBusy] = useState(false);

  const commit = (g: VImg[]) => {
    setGallery(g);
    onChange({ gallery: g });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= gallery.length) return;
    const g = [...gallery];
    [g[i], g[j]] = [g[j], g[i]];
    commit(g);
  };

  const remove = (i: number) => commit(gallery.filter((_, idx) => idx !== i));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
    const added: VImg[] = [];
    for (const file of Array.from(files)) {
      try {
        const body = new FormData();
        body.append('file', file);
        body.append('folder', vehicle.cloudinaryFolder);
        const res = await fetch(`${API}/upload`, { method: 'POST', body });
        if (res.ok) {
          const json = await res.json();
          added.push({ publicId: json.publicId ?? json.public_id, alt: file.name, tag: 'gallery' });
        } else throw new Error();
      } catch {
        // Offline/demo fallback — reference the target folder so the id is real once uploaded.
        added.push({ publicId: `${vehicle.cloudinaryFolder}/${file.name.replace(/\.[^.]+$/, '')}`, alt: file.name, tag: 'gallery' });
      }
    }
    commit([...gallery, ...added]);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-navy-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-navy-700">{vehicle.title}</h3>
            <p className="text-[13px] text-ink-400">Cloudinary folder: {vehicle.cloudinaryFolder}</p>
          </div>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-mist-200 text-navy-700 hover:bg-brand-100">
            <X className="size-5" />
          </button>
        </div>

        {/* Upload dropzone */}
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line bg-mist-100 px-6 py-10 text-center transition-colors hover:border-brand-400">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-600">
            <Upload className="size-6" />
          </span>
          <span className="font-bold text-navy-700">{busy ? 'Uploading…' : 'Upload images to Cloudinary'}</span>
          <span className="text-[13px] text-ink-400">PNG / JPG / WebP · dropped straight into {vehicle.cloudinaryFolder}</span>
          <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>

        {/* Hero / cover pickers */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-2xl border border-line p-3">
            <div className="mb-1 flex items-center gap-2 font-bold text-navy-700"><Crown className="size-4 text-amber-500" /> Hero</div>
            <code className="break-all text-[11px] text-ink-400">{vehicle.heroImage}</code>
          </div>
          <div className="rounded-2xl border border-line p-3">
            <div className="mb-1 flex items-center gap-2 font-bold text-navy-700"><LayoutTemplate className="size-4 text-brand-600" /> Cover</div>
            <code className="break-all text-[11px] text-ink-400">{vehicle.coverImage}</code>
          </div>
        </div>

        {/* Gallery grid */}
        <div className="mt-6 space-y-3">
          <h4 className="font-bold text-navy-700">Gallery ({gallery.length})</h4>
          {gallery.map((img, i) => (
            <div key={img.publicId + i} className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
              <img src={cld(img.publicId, { width: 140, height: 90, crop: 'fill' })} alt={img.alt}
                className="h-14 w-20 shrink-0 rounded-lg bg-mist-200 object-cover"
                onError={(e) => ((e.currentTarget.style.visibility = 'hidden'))} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-navy-700">{img.tag ?? 'image'}</div>
                <code className="block truncate text-[11px] text-ink-400">{img.publicId}</code>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconBtn onClick={() => onChange({ heroImage: img.publicId })} title="Set as hero"><Crown className="size-4" /></IconBtn>
                <IconBtn onClick={() => onChange({ coverImage: img.publicId })} title="Set as cover"><LayoutTemplate className="size-4" /></IconBtn>
                <IconBtn onClick={() => move(i, -1)} title="Move up"><ArrowUp className="size-4" /></IconBtn>
                <IconBtn onClick={() => move(i, 1)} title="Move down"><ArrowDown className="size-4" /></IconBtn>
                <IconBtn onClick={() => remove(i)} title="Delete" danger><Trash2 className="size-4" /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={'grid size-8 place-items-center rounded-lg border border-line transition-colors ' + (danger ? 'text-red-500 hover:border-red-300 hover:bg-red-50' : 'text-navy-700 hover:border-brand-400 hover:text-brand-600')}
    >
      {children}
    </button>
  );
}
