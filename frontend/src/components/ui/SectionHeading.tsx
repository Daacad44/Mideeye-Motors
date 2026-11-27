import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

/** Small uppercase red label above a section title. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  /** Kept for backwards compatibility; the eyebrow is always Daljir red. */
  color?: 'amber' | 'brand';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.16em] text-brand-400',
        className,
      )}
    >
      <span className="h-[3px] w-6 rounded-full bg-brand-600" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  highlight,
  className,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  className?: string;
  align?: 'left' | 'center';
  eyebrowColor?: 'amber' | 'brand';
}) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      {eyebrow && (
        <div className={cn('mb-3', align === 'center' && 'flex justify-center')}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-[44px]">
        {title} {highlight && <span className="text-brand-600">{highlight}</span>}
      </h2>
    </div>
  );
}
