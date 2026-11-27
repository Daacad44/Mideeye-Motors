import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'outline-light';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-bold rounded-[14px] transition-all duration-200 whitespace-nowrap select-none cursor-pointer active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none';

// One accent: Daljir red for the primary action, quiet outlines elsewhere.
const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-hover hover:shadow-[var(--shadow-glow-brand)]',
  secondary:
    'bg-brand-600 text-white hover:bg-brand-hover hover:shadow-[var(--shadow-glow-brand)]',
  ghost: 'text-ink-700 hover:bg-white/5 hover:text-white',
  dark: 'bg-navy-950 text-white border border-white/10 hover:bg-elevated',
  'outline-light':
    'border border-white/16 text-white hover:bg-white/8',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-4 py-2 text-sm',
  md: 'min-h-12 px-6 py-3 text-[15px]',
  lg: 'min-h-14 px-7 py-4 text-base',
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
