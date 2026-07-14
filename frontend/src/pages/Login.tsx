import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, ArrowLeft, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-[15px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none';

  return (
    <div className="relative grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-[linear-gradient(150deg,#061423,#0d2b50_60%,#0b67c2)] lg:block">
        <div className="pointer-events-none absolute inset-0 dotted-grid opacity-40" />
        <div className="pointer-events-none absolute -right-16 top-1/3 size-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo variant="light" />
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-white">
              Command every<br /><span className="text-gradient">journey.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[16px] text-brand-100/80">
              Sign in to manage bookings, save favourites and unlock member pricing
              across our premium fleet.
            </p>
          </div>
          <p className="text-[13px] text-brand-100/50">© {new Date().getFullYear()} Mideeye Motors & Rental Car Co.</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-mist-100 px-5 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-400 hover:text-brand-600">
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-navy-700">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="mt-2 text-ink-500">
            {mode === 'login' ? 'Sign in to your Mideeye Motors account.' : 'Join Mideeye Motors in seconds.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input className={field} placeholder="Full name" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input type="email" className={field} placeholder="Email address" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input type="password" className={field} placeholder="Password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13.5px] font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-[14.5px] text-ink-500">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-bold text-brand-600 hover:underline"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
