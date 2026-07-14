import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function Eyebrow({
  children,
  className,
  color = 'amber',
}: {
  children: ReactNode;
  className?: string;
  color?: 'amber' | 'brand';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-[12.5px] font-bold uppercase tracking-[0.18em]',
        color === 'amber' ? 'text-amber-500' : 'text-brand-500',
        className,
      )}
    >
      <span
        className={cn(
          'h-[3px] w-6 rounded-full',
          color === 'amber' ? 'bg-amber-500' : 'bg-brand-500',
        )}
      />
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
  eyebrowColor = 'amber',
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
        <div className={cn('mb-4', align === 'center' && 'flex justify-center')}>
          <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className="font-display text-3xl font-extrabold leading-[1.05] sm:text-4xl lg:text-[44px]">
        {title} {highlight && <span className="text-brand-600">{highlight}</span>}
      </h2>
    </div>
  );
}
