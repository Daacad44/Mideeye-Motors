import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, ArrowLeft, User, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';
import { authApi } from '@/lib/authApi';

type Mode = 'login' | 'register' | 'forgot';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const { login, register } = useAuth();
  const { t } = useI18n();
  useSeo({ title: t('auth.signIn') });
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSent(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await authApi.forgotPassword(form.email);
        setSent(true);
      } else if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/admin');
      } else {
        await register(form.name, form.email, form.password);
        navigate('/admin');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-[15px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none';

  const heading = mode === 'login' ? t('auth.welcomeBack') : mode === 'register' ? t('auth.createAccount') : 'Reset password';
  const subtext =
    mode === 'login'
      ? t('auth.signInSub')
      : mode === 'register'
        ? t('auth.registerSub')
        : 'Enter your email and we’ll send you a reset link.';

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
            <ArrowLeft className="size-4" /> {t('auth.backHome')}
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-navy-700">{heading}</h1>
          <p className="mt-2 text-ink-500">{subtext}</p>

          {mode === 'forgot' && sent ? (
            <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-center shadow-[var(--shadow-soft)]">
              <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
              <p className="mt-3 text-[14.5px] font-medium text-navy-700">
                If that email exists, we’ve sent a reset link. Check your inbox and spam folder.
              </p>
              <button onClick={() => switchMode('login')} className="mt-5 font-bold text-brand-600 hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="mt-8 space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input className={field} placeholder={t('auth.fullName')} required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                  <input type="email" className={field} placeholder={t('auth.email')} required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                {mode !== 'forgot' && (
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input type="password" className={field} placeholder={t('auth.password')} required value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                )}
                {mode === 'login' && (
                  <div className="text-right">
                    <button type="button" onClick={() => switchMode('forgot')}
                      className="text-[13px] font-semibold text-brand-600 hover:underline">
                      {t('auth.forgot')}
                    </button>
                  </div>
                )}
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13.5px] font-medium text-red-600">{error}</p>}
                <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : mode === 'login' ? t('auth.signIn') : mode === 'register' ? t('auth.register') : 'Send reset link'}
                </Button>
              </form>

              {mode === 'forgot' ? (
                <p className="mt-6 text-center text-[14.5px] text-ink-500">
                  Remembered it?{' '}
                  <button onClick={() => switchMode('login')} className="font-bold text-brand-600 hover:underline">
                    Back to sign in
                  </button>
                </p>
              ) : (
                <p className="mt-6 text-center text-[14.5px] text-ink-500">
                  {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
                  <button
                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                    className="font-bold text-brand-600 hover:underline"
                  >
                    {mode === 'login' ? t('auth.register') : t('auth.signIn')}
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
