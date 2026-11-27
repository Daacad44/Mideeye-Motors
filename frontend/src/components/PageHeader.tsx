import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/context/LocaleContext';

export function PageHeader({
  title,
  subtitle,
  crumb,
}: {
  title: string;
  subtitle?: string;
  crumb: string;
}) {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(900px_320px_at_80%_120%,rgba(229,20,43,.18),transparent_70%),linear-gradient(180deg,#0b0e13,#07090c)]">
      <div className="relative mx-auto max-w-[1320px] px-4 py-14 sm:px-6 lg:py-16">
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-ink-400">
          <Link to="/" className="hover:text-white">{t('nav.home')}</Link>
          <ChevronRight className="size-3.5" aria-hidden /> <span className="text-ink-700">{crumb}</span>
        </nav>
        <h1 className="poster text-4xl text-white sm:text-5xl lg:text-[56px]">{title}</h1>
        {subtitle && <p className="mt-4 max-w-xl text-[17px] text-ink-500">{subtitle}</p>}
      </div>
    </section>
  );
}
