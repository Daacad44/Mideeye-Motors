import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { adminApi, type AuditEntry } from '@/lib/adminApi';

export function AuditPanel() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.audit().then((r) => setLogs(r.data)).catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy-700">
        <ScrollText className="size-5 text-brand-600" /> Audit log
      </h3>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[12px] font-bold uppercase tracking-wide text-ink-400">
              <th className="py-3">Action</th><th className="py-3">Entity</th><th className="py-3">Actor</th><th className="py-3 text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-line/70 last:border-0">
                <td className="py-3"><code className="rounded bg-mist-200 px-2 py-0.5 text-[12px] font-bold text-navy-700">{l.action}</code></td>
                <td className="py-3 text-ink-500">{l.entity}</td>
                <td className="py-3 text-ink-500">{l.actor?.email ?? 'system'}</td>
                <td className="py-3 text-right text-[13px] text-ink-400">{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && !error && (
              <tr><td colSpan={4} className="py-10 text-center text-ink-400">No audit entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
