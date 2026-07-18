import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, ArrowRight } from 'lucide-react';
import { Logo } from './ui/Logo';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useI18n } from '@/context/LocaleContext';

const cols = [
  {
    titleKey: 'footer.company',
    links: [
      { key: 'footer.about', to: '/about' },
      { key: 'footer.fleet', to: '/fleet' },
      { key: 'footer.services', to: '/services' },
      { key: 'footer.pricing', to: '/pricing' },
    ],
  },
  {
    titleKey: 'footer.support',
    links: [
      { key: 'footer.contact', to: '/contact' },
      { key: 'footer.faq', to: '/faq' },
      { key: 'footer.terms', to: '/terms' },
      { key: 'footer.privacy', to: '/privacy' },
    ],
  },
];

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 dotted-grid opacity-50" />

      <div className="relative mx-auto max-w-[1360px] px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo variant="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-100/70">
              {t('footer.tagline')}
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
            <div key={col.titleKey}>
              <h4 className="mb-5 text-sm font-bold uppercase tracking-widest text-white">
                {t(col.titleKey)}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.key}>
                    <Link
                      to={l.to}
                      className="text-sm text-brand-100/70 transition-colors hover:text-brand-300"
                    >
                      {t(l.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-widest text-white">
              {t('footer.getInTouch')}
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
              {t('footer.reserve')} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-brand-100/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Mideeye Motors & Rental Car Co. {t('footer.rights')}</p>
          <LocaleSwitcher variant="light" />
        </div>
      </div>
    </footer>
  );
}
