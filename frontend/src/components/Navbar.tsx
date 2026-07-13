import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Phone, Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from './ui/Logo';
import { ButtonLink } from './ui/Button';
import { cn } from '@/lib/cn';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Fleet', to: '/fleet' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Contact', to: '/contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

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
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/85 backdrop-blur-xl border-b border-line shadow-[0_4px_20px_rgba(13,39,73,.05)]'
          : 'bg-white/60 backdrop-blur-md border-b border-transparent',
      )}
    >
      <div className="mx-auto flex max-w-[1360px] items-center gap-7 px-5 py-3.5 lg:px-8">
        <Link to="/" aria-label="Mideeye Motors home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3.5 py-2 text-[14.5px] font-semibold transition-colors',
                  isActive
                    ? 'text-brand-600'
                    : 'text-navy-700/80 hover:text-brand-600 hover:bg-brand-100/60',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <a
            href="tel:+252612345678"
            className="hidden items-center gap-2 text-sm font-semibold text-navy-700 xl:flex"
          >
            <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-600">
              <Phone className="size-4" />
            </span>
            +252 61 2345678
          </a>
          <Link
            to="/login"
            className="hidden rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-navy-700 transition-colors hover:border-brand-400 hover:text-brand-600 sm:inline-flex"
          >
            Login
          </Link>
          <ButtonLink to="/booking" size="sm" className="hidden sm:inline-flex">
            Book Now <ArrowRight className="size-4" />
          </ButtonLink>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border border-line text-navy-700 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-line bg-white lg:hidden">
          <nav className="mx-auto flex max-w-[1360px] flex-col px-5 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-3 text-[15px] font-semibold',
                    isActive ? 'text-brand-600 bg-brand-100/60' : 'text-navy-700',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-3">
              <Link
                to="/login"
                className="flex-1 rounded-xl border border-line px-5 py-3 text-center text-sm font-bold text-navy-700"
              >
                Login
              </Link>
              <ButtonLink to="/booking" className="flex-1">
                Book Now <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
