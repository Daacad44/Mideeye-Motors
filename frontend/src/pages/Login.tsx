import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, ArrowLeft, User, Loader2, CheckCircle2, ShieldCheck, Zap, Star } from 'lucide-react';
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

  const field =
    'w-full rounded-xl border border-line bg-white py-3 pl-11 pr-4 text-[15px] font-medium text-navy-700 placeholder:text-ink-400 transition-colors duration-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100';

  const heading = mode === 'login' ? t('auth.welcomeBack') : mode === 'register' ? t('auth.createAccount') : t('auth.resetTitle');
  const subtext =
    mode === 'login'
      ? t('auth.signInSub')
      : mode === 'register'
        ? t('auth.registerSub')
        : t('auth.resetSub');

  // Member benefits shown in the dark visual panel.
  const benefits = [
    { icon: ShieldCheck, key: 'auth.benefitInsured' as const },
    { icon: Zap, key: 'auth.benefitFast' as const },
    { icon: Star, key: 'auth.benefitPricing' as const },
  ];
  // Subtle trust line echoing the home page.
  const trust = ['auth.trustCars', 'auth.trustRenters', 'auth.trustRating'] as const;

  return (
    <div className="relative grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-[linear-gradient(150deg,#061423,#0d2b50_60%,#0b67c2)] lg:block">
        {/* Decorative layer: dotted grid + amber and brand-blue glows for depth. */}
        <div className="pointer-events-none absolute inset-0 dotted-grid opacity-40" />
        <div className="pointer-events-none absolute -right-24 top-1/4 size-96 rounded-full bg-[radial-gradient(circle,#f59e0b,transparent_70%)] opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -left-28 bottom-0 size-[30rem] rounded-full bg-[radial-gradient(circle,#18a8f5,transparent_68%)] opacity-25 blur-3xl" />

        <div className="relative flex h-full flex-col p-12 xl:p-14">
          {/* Top — logo */}
          <Logo variant="plain" height={60} />

          {/* Middle — hero + benefits, vertically centered */}
          <div className="flex flex-1 flex-col justify-center py-12">
            <div className="mb-6 inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.18em] text-brand-300">
              <span className="h-[3px] w-6 rounded-full bg-amber-500" />
              {t('auth.panelBadge')}
            </div>
            <h2 className="font-display text-[42px] font-extrabold leading-[1.02] text-white xl:text-5xl">
              {t('auth.heroLine1')}
              <br />
              <span className="text-gradient">{t('auth.heroLine2')}</span>
            </h2>
            <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-brand-100/80">
              {t('auth.heroCopy')}
            </p>

            <ul className="mt-10 space-y-4">
              {benefits.map((b) => (
                <li key={b.key} className="flex items-center gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300 ring-1 ring-inset ring-white/15">
                    <b.icon className="size-5" />
                  </span>
                  <span className="text-[15px] font-semibold text-brand-100/90">{t(b.key)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom — trust strip + copyright */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold text-brand-100/65">
              {trust.map((k, i) => (
                <span key={k} className="inline-flex items-center gap-5">
                  {i > 0 && <span className="h-4 w-px bg-white/15" />}
                  {t(k)}
                </span>
              ))}
            </div>
            <p className="text-[13px] text-brand-100/50">© {new Date().getFullYear()} Mideeye Motors & Rental Car Co.</p>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-mist-100 px-5 py-16 sm:px-8">
        <div className="w-full max-w-md">
          {/* Brand mark for mobile, where the dark visual panel is hidden */}
          <div className="mb-8 flex justify-center lg:hidden"><Logo height={52} /></div>
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-400 transition-colors hover:text-brand-600">
            <ArrowLeft className="size-4" /> {t('auth.backHome')}
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-navy-700">{heading}</h1>
          <p className="mt-2 text-ink-500">{subtext}</p>

          {mode === 'forgot' && sent ? (
            <div className="mt-8 rounded-2xl border border-line bg-white p-8 text-center shadow-[var(--shadow-soft)]">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="size-8 text-emerald-500" />
              </span>
              <p className="mt-4 text-[14.5px] font-medium leading-relaxed text-navy-700">
                {t('auth.resetSent')}
              </p>
              <button onClick={() => switchMode('login')} className="mt-6 font-bold text-brand-600 hover:underline">
                {t('auth.backToSignIn')}
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="mt-8 space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    <input className={field} placeholder={t('auth.fullName')} required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                )}
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                  <input type="email" className={field} placeholder={t('auth.email')} required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                {mode !== 'forgot' && (
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
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
                  {busy ? <Loader2 className="size-4 animate-spin" /> : mode === 'login' ? t('auth.signIn') : mode === 'register' ? t('auth.register') : t('auth.sendReset')}
                </Button>
              </form>

              {mode === 'forgot' ? (
                <p className="mt-6 text-center text-[14.5px] text-ink-500">
                  {t('auth.remembered')}
                  <button onClick={() => switchMode('login')} className="font-bold text-brand-600 hover:underline">
                    {t('auth.backToSignIn')}
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
