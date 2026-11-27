import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Phone, Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from './ui/Logo';
import { ButtonLink } from './ui/Button';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useI18n } from '@/context/LocaleContext';
import { useBranding } from '@/lib/branding';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

const links = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.fleet', to: '/fleet' },
  { key: 'nav.pricing', to: '/pricing' },
  { key: 'nav.about', to: '/about' },
  { key: 'nav.services', to: '/services' },
  { key: 'nav.contact', to: '/contact' },
];

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { t } = useI18n();
  const { phone } = useBranding();
  const { user, isStaff } = useAuth();
  // Signed in: the login button becomes a link to the account (or admin) page.
  const account = user
    ? { to: isStaff ? '/admin' : '/dashboard', label: isStaff ? 'Admin' : t('nav.dashboard') }
    : { to: '/login', label: t('common.login') };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-colors duration-300',
        scrolled || open
          ? 'border-white/8 bg-navy-900/90 backdrop-blur-xl'
          : 'border-transparent bg-navy-900/40 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex max-w-[1320px] items-center gap-6 px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Daljir Rental Car" className="shrink-0">
          <Logo height={40} />
        </Link>

        <nav aria-label={t('nav.main')} className="ml-2 hidden items-center gap-0.5 xl:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[15px] font-medium transition-colors',
                  isActive
                    ? 'text-white after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-brand-600'
                    : 'text-ink-500 hover:text-white',
                )
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden 2xl:block">
            <LocaleSwitcher variant="light" />
          </div>
          {phone && (
            <a
              href={telHref(phone)}
              className="hidden items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink-700 transition-colors hover:text-white 2xl:flex"
            >
              <Phone className="size-4 text-brand-400" aria-hidden />
              {phone}
            </a>
          )}
          <Link
            to={account.to}
            className="hidden min-h-10 items-center rounded-xl border border-white/14 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/8 sm:inline-flex"
          >
            {account.label}
          </Link>
          <ButtonLink to="/booking" size="sm" className="hidden sm:inline-flex">
            {t('common.bookNow')} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <button
            type="button"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-xl border border-white/14 text-white xl:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/8 bg-navy-900 xl:hidden">
          <nav aria-label={t('nav.main')} className="mx-auto flex max-w-[1320px] flex-col px-4 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-3 py-3 text-[16px] font-semibold',
                    isActive ? 'bg-brand-600/12 text-white' : 'text-ink-500',
                  )
                }
              >
                {t(l.key)}
              </NavLink>
            ))}
            <div className="mt-3 px-1"><LocaleSwitcher variant="light" /></div>
            <div className="mt-3 flex gap-3">
              <Link
                to={account.to}
                className="flex min-h-12 flex-1 items-center justify-center rounded-[14px] border border-white/14 text-sm font-bold text-white"
              >
                {account.label}
              </Link>
              <ButtonLink to="/booking" className="flex-1">
                {t('common.bookNow')} <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
