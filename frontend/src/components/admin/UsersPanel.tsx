import { useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, Ban, KeyRound, Trash2, CheckCircle2 } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import type { AdminUser, Role } from '@/types/media';
import { useAuth } from '@/context/AuthContext';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'];
const roleBadge: Record<Role, string> = {
  SUPER_ADMIN: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-brand-100 text-brand-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  STAFF: 'bg-emerald-100 text-emerald-700',
  CUSTOMER: 'bg-mist-200 text-ink-500',
};

export function UsersPanel() {
  const { hasRole } = useAuth();
  const isSuper = hasRole('SUPER_ADMIN');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' as Role });

  const load = () =>
    adminApi.listUsers().then((r) => setUsers(r.data)).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.createUser(form);
      setForm({ name: '', email: '', password: '', role: 'STAFF' });
      load();
    } catch (err) { setError((err as Error).message); }
  };

  const act = async (fn: Promise<unknown>) => {
    try { await fn; load(); } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      {isSuper && (
        <form onSubmit={create} className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy-700">
            <UserPlus className="size-5 text-brand-600" /> Create team member
          </h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-navy-700 focus:border-brand-400 focus:outline-none" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-navy-700 focus:border-brand-400 focus:outline-none" />
            <input required type="password" placeholder="Password (min 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-navy-700 focus:border-brand-400 focus:outline-none" />
            <div className="flex gap-2">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="flex-1 rounded-xl border border-line px-3 py-2.5 text-sm font-bold text-navy-700 focus:outline-none">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="rounded-xl bg-brand-600 px-4 text-sm font-bold text-white hover:bg-navy-700">Add</button>
            </div>
          </div>
        </form>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[12px] font-bold uppercase tracking-wide text-ink-400">
              <th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th>
              {isSuper && <th className="p-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const locked = u.role === 'SUPER_ADMIN';
              return (
                <tr key={u.id} className="border-b border-line/70 last:border-0">
                  <td className="p-4">
                    <div className="font-bold text-navy-700">{u.name}</div>
                    <div className="text-[12px] text-ink-400">{u.email}</div>
                  </td>
                  <td className="p-4">
                    {isSuper && !locked ? (
                      <select value={u.role} onChange={(e) => act(adminApi.setRole(u.id, e.target.value as Role))}
                        className={'rounded-lg px-2 py-1 text-[12px] font-bold focus:outline-none ' + roleBadge[u.role]}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={'rounded-lg px-2.5 py-1 text-[12px] font-bold ' + roleBadge[u.role]}>{u.role}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-bold ' + (u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                      {u.status === 'ACTIVE' ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />} {u.status}
                    </span>
                  </td>
                  {isSuper && (
                    <td className="p-4">
                      <div className="flex justify-end gap-1.5">
                        {!locked && (
                          <>
                            <IconBtn title={u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              onClick={() => act(adminApi.setStatus(u.id, u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'))}>
                              {u.status === 'ACTIVE' ? <Ban className="size-4" /> : <ShieldCheck className="size-4" />}
                            </IconBtn>
                            <IconBtn title="Reset password" onClick={() => {
                              const pw = window.prompt('New password (min 8 chars):');
                              if (pw) act(adminApi.resetPassword(u.id, pw));
                            }}><KeyRound className="size-4" /></IconBtn>
                            <IconBtn title="Delete" danger onClick={() => {
                              if (window.confirm(`Delete ${u.email}?`)) act(adminApi.deleteUser(u.id));
                            }}><Trash2 className="size-4" /></IconBtn>
                          </>
                        )}
                        {locked && <span className="text-[12px] font-semibold text-ink-400">Protected</span>}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
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
