import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, ArrowRight } from 'lucide-react';
import { Logo } from './ui/Logo';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useI18n } from '@/context/LocaleContext';
import { useBranding } from '@/lib/branding';

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

const SOCIAL = [
  { id: 'facebook', Icon: Facebook, label: 'Facebook' },
  { id: 'instagram', Icon: Instagram, label: 'Instagram' },
  { id: 'twitter', Icon: Twitter, label: 'X / Twitter' },
];

export function Footer() {
  const { t } = useI18n();
  const { phone, email, socials } = useBranding();
  const contactEmail = email || 'hello@daljirrentalcar.com';
  const socialLinks = SOCIAL.filter((s) => socials?.[s.id]);

  return (
    <footer className="border-t border-white/8 bg-navy-950">
      <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo height={40} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-400">{t('footer.tagline')}</p>
            {socialLinks.length > 0 && (
              <div className="mt-6 flex gap-2">
                {socialLinks.map(({ id, Icon, label }) => (
                  <a
                    key={id}
                    href={socials[id]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="grid size-11 place-items-center rounded-xl border border-white/10 text-ink-500 transition-colors hover:border-brand-600 hover:text-white"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {cols.map((col) => (
            <nav key={col.titleKey} aria-label={t(col.titleKey)}>
              <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.16em] text-white">
                {t(col.titleKey)}
              </h2>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.key}>
                    <Link to={l.to} className="text-sm text-ink-400 transition-colors hover:text-white">
                      {t(l.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.16em] text-white">
              {t('footer.getInTouch')}
            </h2>
            <ul className="space-y-3.5 text-sm text-ink-400">
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone className="size-4 text-brand-400" aria-hidden />
                  <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="hover:text-white">{phone}</a>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-brand-400" aria-hidden />
                <a href={`mailto:${contactEmail}`} className="hover:text-white">{contactEmail}</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-brand-400" aria-hidden /> {t('footer.address')}
              </li>
            </ul>
            <Link
              to="/booking"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              {t('footer.reserve')} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/6 pt-6 text-[13px] text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Daljir Rental Car. {t('footer.rights')}</p>
          <LocaleSwitcher variant="light" />
        </div>
      </div>
    </footer>
  );
}
