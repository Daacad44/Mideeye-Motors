import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Lock, Loader2, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { authApi } from '@/lib/authApi';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const field = 'w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-[15px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords don’t match.');
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-72px)] place-items-center bg-mist-100 px-5 py-16">
      <div className="w-full max-w-md">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-400 hover:text-brand-600">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>

        <div className="rounded-3xl border border-line bg-white p-8 shadow-[var(--shadow-soft)]">
          <div className="mb-6 flex justify-center"><Logo height={52} /></div>

          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
              <h1 className="mt-4 font-display text-2xl font-extrabold text-navy-700">Password updated</h1>
              <p className="mt-2 text-ink-500">You can now sign in with your new password. Redirecting…</p>
              <Link to="/login" className="mt-5 inline-block font-bold text-brand-600 hover:underline">Continue to sign in</Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-600"><KeyRound className="size-7" /></span>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-navy-700">Invalid reset link</h1>
              <p className="mt-2 text-ink-500">This link is missing its token. Request a new one from the sign-in page.</p>
              <Link to="/login" className="mt-5 inline-block font-bold text-brand-600 hover:underline">Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="text-center font-display text-2xl font-extrabold text-navy-700">Choose a new password</h1>
              <p className="mt-2 text-center text-ink-500">Set a new password for your account.</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                  <input type="password" className={field} placeholder="New password" required value={password}
                    onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                  <input type="password" className={field} placeholder="Confirm new password" required value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} />
                </div>
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13.5px] font-medium text-red-600">{error}</p>}
                <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : 'Update password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
