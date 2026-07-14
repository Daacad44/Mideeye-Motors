import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, ArrowRight } from 'lucide-react';
import { Logo } from './ui/Logo';

const cols = [
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Our Fleet', to: '/fleet' },
      { label: 'Services', to: '/services' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact', to: '/contact' },
      { label: 'Booking', to: '/booking' },
      { label: 'FAQ', to: '/contact' },
      { label: 'Terms', to: '/contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 dotted-grid opacity-50" />

      <div className="relative mx-auto max-w-[1360px] px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo variant="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-100/70">
              Premium car rental across Somalia. Command every journey with a
              spotless, fully-insured fleet — from the legendary Land Cruiser to
              executive sedans.
            </p>
            <div className="mt-6 flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-100 transition-colors hover:bg-brand-500 hover:text-white"
                  aria-label="Social link"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-5 text-sm font-bold uppercase tracking-widest text-white">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-brand-100/70 transition-colors hover:text-brand-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-widest text-white">
              Get in touch
            </h4>
            <ul className="space-y-4 text-sm text-brand-100/80">
              <li className="flex items-center gap-3">
                <Phone className="size-4 text-brand-400" /> +252 61 2345678
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-brand-400" /> hello@mideeyemotors.com
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-brand-400" /> Maka Al-Mukarama Rd,
                Mogadishu, Somalia
              </li>
            </ul>
            <Link
              to="/booking"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Reserve a car <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-brand-100/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Mideeye Motors & Rental Car Co. All rights reserved.</p>
          <p>Designed for the road ahead.</p>
        </div>
      </div>
    </footer>
  );
}
