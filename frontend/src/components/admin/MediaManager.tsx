import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud, Search, Trash2, RefreshCw, Check, Link2, Hash,
  FolderOpen, X, Loader2, Image as ImageIcon, Pencil, ArrowUpDown, ShieldAlert,
} from 'lucide-react';
import { mediaApi, type MediaSort } from '@/lib/mediaApi';
import { ik } from '@/lib/imagekitImages';
import { ApiError } from '@/lib/http';
import type { MediaImage } from '@/types/media';

function prettyBytes(n: number | null) {
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

function baseName(filePath: string) {
  return filePath.split('/').pop() || filePath;
}

export function MediaManager() {
  const [assets, setAssets] = useState<MediaImage[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [sort, setSort] = useState<MediaSort>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [targetFolder, setTargetFolder] = useState('/mideeye-motors/media');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id?: string; ids?: string[]; usedBy: string[] } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mediaApi.list({ search: search || undefined, folder: folder || undefined, sort, order });
      setAssets(res.data);
      setFolders(res.folders);
    } catch (e) {
      setError((e as Error).message);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [search, folder, sort, order]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const doUpload = async (files: File[]) => {
    if (!files.length) return;
    setProgress(0);
    try {
      if (files.length === 1) {
        await mediaApi.upload(files[0], { folder: targetFolder }, setProgress);
      } else {
        const res = await mediaApi.bulkUpload(files, { folder: targetFolder }, setProgress);
        if (res.failed.length) setError(`${res.failed.length} file(s) failed: ${res.failed.map((f) => `${f.filename} (${f.error})`).join('; ')}`);
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    doUpload(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/')));
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch { /* ignore */ }
  };

  const remove = async (id: string, force = false) => {
    try {
      await mediaApi.remove(id, force);
      setConfirmDelete(null);
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const usedBy = (e.body as { usedBy?: { label: string }[] })?.usedBy ?? [];
        setConfirmDelete({ id, usedBy: usedBy.map((u) => u.label) });
      } else {
        setError((e as Error).message);
      }
    }
  };

  const bulkDelete = async (force = false) => {
    if (!selected.size) return;
    try {
      await mediaApi.bulkDelete([...selected], force);
      setConfirmDelete(null);
      setSelected(new Set());
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConfirmDelete({ ids: [...selected], usedBy: [] });
      } else {
        setError((e as Error).message);
      }
    }
  };

  const saveRename = async () => {
    if (!editing) return;
    await mediaApi.update(editing.id, { newFileName: editing.value }).catch((e) => setError((e as Error).message));
    setEditing(null);
    load();
  };

  const toggleSort = (field: MediaSort) => {
    if (sort === field) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(field); setOrder('desc'); }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5">
          <Search className="size-4 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by path, alt, caption or tag…"
            className="w-full bg-transparent text-sm font-medium text-navy-700 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
          <FolderOpen className="size-4 text-ink-400" />
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="bg-transparent text-sm font-bold text-navy-700 focus:outline-none"
          >
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
          <ArrowUpDown className="size-4 text-ink-400" />
          <select
            value={sort}
            onChange={(e) => toggleSort(e.target.value as MediaSort)}
            className="bg-transparent text-sm font-bold text-navy-700 focus:outline-none"
          >
            <option value="createdAt">Recently uploaded</option>
            <option value="filePath">Name</option>
            <option value="size">Size</option>
          </select>
        </div>
        <button onClick={load} className="grid size-10 place-items-center rounded-xl border border-line text-navy-700 hover:border-brand-400 hover:text-brand-600" aria-label="Refresh">
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
        </button>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={
          'mt-4 rounded-3xl border-2 border-dashed p-8 text-center transition-colors ' +
          (dragOver ? 'border-brand-500 bg-brand-100/50' : 'border-line bg-mist-100')
        }
      >
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600">
          {progress !== null ? <Loader2 className="size-7 animate-spin" /> : <UploadCloud className="size-7" />}
        </div>
        <p className="mt-3 font-bold text-navy-700">
          {progress !== null ? `Uploading… ${progress}%` : 'Drag & drop images here'}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[13px] text-ink-400">
          <span>Destination folder:</span>
          <input
            value={targetFolder}
            onChange={(e) => setTargetFolder(e.target.value)}
            className="rounded-lg border border-line bg-white px-2 py-1 font-mono text-[12px] text-navy-700 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {['/mideeye-motors/brand', '/mideeye-motors/media', '/mideeye-motors/banner'].map((f) => (
            <button key={f} type="button" onClick={() => setTargetFolder(f)}
              className={'rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ' +
                (targetFolder === f ? 'bg-brand-600 text-white' : 'bg-mist-200 text-navy-700 hover:bg-brand-100')}>
              {f.split('/')[2] === 'brand' ? '🏷️ brand (official logo)' : f.split('/')[2]}
            </button>
          ))}
        </div>
        {progress !== null && (
          <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-mist-200">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <button
          onClick={() => fileInput.current?.click()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-700"
        >
          <UploadCloud className="size-4" /> Select images
        </button>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden
          onChange={(e) => { doUpload(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-600">
          <X className="size-4 shrink-0" /> {error}
        </div>
      )}

      {confirmDelete && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-700">
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">This image is in use{confirmDelete.usedBy.length ? `: ${confirmDelete.usedBy.join(', ')}` : ''}.</p>
              <p className="mt-0.5">Deleting it will remove those references too.</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => confirmDelete.id ? remove(confirmDelete.id, true) : bulkDelete(true)}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-red-600"
                >
                  Delete anyway
                </button>
                <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-amber-300 px-3 py-1.5 text-[12px] font-bold text-amber-700">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-20 z-10 mt-4 flex items-center justify-between rounded-2xl border border-line bg-navy-900 px-4 py-3 text-white shadow-lg">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-white/10">Clear</button>
            <button onClick={() => bulkDelete()} className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold hover:bg-red-600">
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white py-20 text-center">
            <ImageIcon className="mx-auto size-10 text-ink-400" />
            <p className="mt-3 font-display text-lg font-bold text-navy-700">No media yet</p>
            <p className="mt-1 text-ink-400">Upload images above — they’ll be stored in ImageKit and appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((a) => (
              <div key={a.id} className={'group overflow-hidden rounded-2xl border bg-white transition ' + (selected.has(a.id) ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-line')}>
                <div className="relative aspect-[4/3] bg-mist-200">
                  <img src={ik(a.filePath, 'thumb')} alt={a.altText || baseName(a.filePath)} loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => (e.currentTarget.style.opacity = '0.15')} />
                  <label className="absolute left-2 top-2 grid size-6 cursor-pointer place-items-center rounded-md bg-white/90 shadow">
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="accent-brand-600" />
                  </label>
                  {a.inUse && (
                    <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">In use</span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Action title="Copy URL" onClick={() => copy(ik(a.filePath, 'card'), a.id + 'u')} active={copied === a.id + 'u'}><Link2 className="size-4" /></Action>
                    <Action title="Copy ID (use on Fleet tab)" onClick={() => copy(a.id, a.id + 'p')} active={copied === a.id + 'p'}><Hash className="size-4" /></Action>
                    <Action title="Replace" onClick={() => { replaceTarget.current = a.id; replaceInput.current?.click(); }}><RefreshCw className="size-4" /></Action>
                    <Action title="Rename" onClick={() => setEditing({ id: a.id, value: baseName(a.filePath) })}><Pencil className="size-4" /></Action>
                    <Action title="Delete" danger onClick={() => remove(a.id)}><Trash2 className="size-4" /></Action>
                  </div>
                </div>
                <div className="p-3">
                  {editing?.id === a.id ? (
                    <div className="flex gap-1">
                      <input autoFocus value={editing.value} onChange={(e) => setEditing({ id: a.id, value: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                        className="w-full rounded-lg border border-brand-400 px-2 py-1 text-[13px] font-semibold text-navy-700 focus:outline-none" />
                      <button onClick={saveRename} className="grid size-7 place-items-center rounded-lg bg-brand-600 text-white"><Check className="size-4" /></button>
                    </div>
                  ) : (
                    <div className="truncate text-[13.5px] font-bold text-navy-700">{a.caption || baseName(a.filePath)}</div>
                  )}
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-ink-400">
                    <span className="truncate">{a.mimeType?.replace('image/', '').toUpperCase() || 'IMG'} · {a.width ?? '—'}×{a.height ?? '—'}</span>
                    <span>{prettyBytes(a.size)}</span>
                  </div>
                  <code className="mt-1 block truncate text-[10.5px] text-ink-400" title="MediaImage ID — use this to attach the image on the Fleet tab">{a.id}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* hidden replace input */}
      <input ref={replaceInput} type="file" accept="image/*" hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f && replaceTarget.current) {
            setProgress(0);
            await mediaApi.replace(replaceTarget.current, f, setProgress).catch((err) => setError((err as Error).message));
            setProgress(null);
            load();
          }
          e.target.value = '';
        }} />
    </div>
  );
}

function Action({ children, title, onClick, danger, active }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean; active?: boolean }) {
  return (
    <button title={title} aria-label={title} onClick={onClick}
      className={'grid size-8 place-items-center rounded-lg text-white backdrop-blur transition-colors ' + (active ? 'bg-emerald-500' : danger ? 'bg-red-500/90 hover:bg-red-600' : 'bg-white/20 hover:bg-white/35')}>
      {active ? <Check className="size-4" /> : children}
    </button>
  );
}
