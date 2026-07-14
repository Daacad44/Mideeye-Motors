import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  crumb,
}: {
  title: string;
  subtitle?: string;
  crumb: string;
}) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(118deg,#061423,#0d2b50_60%,#0b67c2)]">
      <div className="pointer-events-none absolute inset-0 dotted-grid opacity-50" />
      <div className="pointer-events-none absolute -right-16 -top-28 size-96 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="relative mx-auto max-w-[1360px] px-5 py-16 lg:px-8">
        <nav className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-brand-300">
          <Link to="/" className="hover:text-white">Home</Link>
          <ChevronRight className="size-3.5" /> {crumb}
        </nav>
        <h1 className="font-display text-4xl font-extrabold text-white lg:text-[46px]">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-[17px] text-brand-100/80">{subtitle}</p>}
      </div>
    </section>
  );
}
