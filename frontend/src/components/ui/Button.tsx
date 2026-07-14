import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'outline-light';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 whitespace-nowrap select-none active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-amber-500 text-white shadow-[var(--shadow-glow-amber)] hover:bg-amber-600 hover:-translate-y-0.5',
  secondary:
    'bg-brand-600 text-white shadow-[var(--shadow-glow-brand)] hover:bg-navy-700 hover:-translate-y-0.5',
  ghost: 'text-navy-700 hover:bg-brand-100',
  dark: 'bg-navy-900 text-white hover:bg-navy-950 hover:-translate-y-0.5',
  'outline-light':
    'border border-white/25 text-white glass hover:bg-white/20',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-[15px]',
  lg: 'px-8 py-4 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: CommonProps & { to: string }) {
  return (
    <Link to={to} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
