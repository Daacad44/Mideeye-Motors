import { NavLink } from 'react-router-dom';
import { Home, CarFront, CalendarPlus, Phone, UserRound } from 'lucide-react';
import { useI18n } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

/**
 * App-style bottom navigation for phones (hidden from md up). The centre
 * "Book" action is raised, like a native app's primary tab.
 */
export function MobileTabBar() {
  const { t } = useI18n();
  const { user, isStaff } = useAuth();
  const account = user
    ? { to: isStaff ? '/admin' : '/dashboard', label: isStaff ? 'Admin' : t('nav.tabAccount') }
    : { to: '/login', label: t('nav.tabAccount') };

  const item = ({ isActive }: { isActive: boolean }) =>
    cn('flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-white' : 'text-ink-400');

  return (
    <>
      {/* Keeps page content clear of the fixed bar. */}
      <div className="h-[calc(68px+env(safe-area-inset-bottom))] md:hidden" aria-hidden />
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-navy-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch px-1">
          <NavLink to="/" end className={item}>
            <Home className="size-[20px]" aria-hidden /> {t('nav.tabHome')}
          </NavLink>
          <NavLink to="/fleet" className={item}>
            <CarFront className="size-[20px]" aria-hidden /> {t('nav.tabFleet')}
          </NavLink>
          <NavLink to="/booking" className="flex flex-1 flex-col items-center justify-end pb-1.5 text-[11px] font-bold text-white">
            <span className="-mt-5 mb-1 grid size-12 place-items-center rounded-2xl bg-brand-600 shadow-[0_10px_24px_-8px_rgba(229,20,43,.8)]">
              <CalendarPlus className="size-[22px]" aria-hidden />
            </span>
            {t('nav.tabBook')}
          </NavLink>
          <NavLink to="/contact" className={item}>
            <Phone className="size-[20px]" aria-hidden /> {t('nav.tabContact')}
          </NavLink>
          <NavLink to={account.to} className={item}>
            <UserRound className="size-[20px]" aria-hidden /> <span className="max-w-[72px] truncate">{account.label}</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
