import { useEffect, useState } from 'react';
import { Ticket, Trash2, CheckCircle2, Ban } from 'lucide-react';
import { couponsApi, type Coupon, type CouponType, type CouponPayload } from '@/lib/couponsApi';
import { formatCurrency } from '@/lib/cn';

const TYPES: CouponType[] = ['PERCENT', 'FIXED'];

interface CouponForm {
  code: string;
  type: CouponType;
  value: string;
  maxUses: string;
  minDays: string;
  expiresAt: string;
}
const emptyForm = (): CouponForm => ({ code: '', type: 'PERCENT', value: '10', maxUses: '', minDays: '', expiresAt: '' });

const fmtValue = (c: Coupon) => (c.type === 'PERCENT' ? `${c.value}%` : formatCurrency(c.value));

function statusOf(c: Coupon): { label: string; cls: string } {
  if (!c.active) return { label: 'Inactive', cls: 'bg-mist-200 text-ink-500' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: 'Expired', cls: 'bg-red-100 text-red-600' };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: 'Used up', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' };
}

export function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm());

  const load = () => couponsApi.list().then((r) => setCoupons(r.data)).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: CouponPayload = {
        code: form.code.trim(),
        type: form.type,
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        minDays: form.minDays ? Number(form.minDays) : null,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
      };
      await couponsApi.create(payload);
      setForm(emptyForm());
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const patch = async (id: string, data: Partial<CouponPayload>) => {
    setCoupons((cs) => cs.map((c) => (c.id === id ? { ...c, ...data } : c)));
    try {
      await couponsApi.update(id, data);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await couponsApi.remove(c.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const inputCls = 'rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-navy-700 focus:border-brand-400 focus:outline-none';

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy-700">
          <Ticket className="size-5 text-brand-600" /> Create coupon
        </h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input required placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls + ' font-mono uppercase'} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })} className={inputCls + ' font-bold'}>
            {TYPES.map((t) => <option key={t} value={t}>{t === 'PERCENT' ? '% off' : '$ off'}</option>)}
          </select>
          <input required type="number" min={1} placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} />
          <input type="number" min={1} placeholder="Max uses" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className={inputCls} />
          <input type="number" min={1} placeholder="Min days" value={form.minDays} onChange={(e) => setForm({ ...form, minDays: e.target.value })} className={inputCls} />
          <input type="date" placeholder="Expires" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inputCls} />
        </div>
        <div className="mt-3 flex justify-end">
          <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-700">Add coupon</button>
        </div>
      </form>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[12px] font-bold uppercase tracking-wide text-ink-400">
              <th className="p-4">Code</th><th className="p-4">Discount</th><th className="p-4">Min days</th><th className="p-4">Usage</th><th className="p-4">Expires</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const st = statusOf(c);
              return (
                <tr key={c.id} className="border-b border-line/70 last:border-0">
                  <td className="p-4"><code className="rounded bg-mist-200 px-2 py-0.5 font-mono text-[12.5px] font-bold text-navy-700">{c.code}</code></td>
                  <td className="p-4 font-bold text-navy-700">{fmtValue(c)}</td>
                  <td className="p-4 text-ink-500">{c.minDays ?? '—'}</td>
                  <td className="p-4 text-ink-500">{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}</td>
                  <td className="p-4 text-ink-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}</td>
                  <td className="p-4"><span className={'inline-block rounded-lg px-2.5 py-1 text-[12px] font-bold ' + st.cls}>{st.label}</span></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn title={c.active ? 'Deactivate' : 'Activate'} onClick={() => patch(c.id, { active: !c.active })}>
                        {c.active ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                      </IconBtn>
                      <IconBtn title="Delete" danger onClick={() => remove(c)}><Trash2 className="size-4" /></IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {coupons.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-ink-400">No coupons yet — create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={'grid size-8 place-items-center rounded-lg border border-line transition-colors ' + (danger ? 'text-red-500 hover:border-red-300 hover:bg-red-50' : 'text-navy-700 hover:border-brand-400 hover:text-brand-600')}>
      {children}
    </button>
  );
}
