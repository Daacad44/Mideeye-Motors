import { cn } from '@/lib/cn';

/** Mideeye Motors horizontal lockup — badge mark + wordmark. */
export function Logo({
  className,
  variant = 'dark',
}: {
  className?: string;
  variant?: 'dark' | 'light';
}) {
  const wordColor = variant === 'light' ? '#ffffff' : '#0b67c2';
  const subColor = variant === 'light' ? 'rgba(255,255,255,.72)' : '#7a8aa0';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width="40" height="40" viewBox="0 0 120 120" fill="none" aria-hidden>
        <defs>
          <linearGradient id="mm-lock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#18a8f5" />
            <stop offset="1" stopColor="#0b67c2" />
          </linearGradient>
        </defs>
        <path d="M60 6 108 30 108 74 60 114 12 74 12 30Z" fill="#061423" />
        <path
          d="M60 6 108 30 108 74 60 114 12 74 12 30Z"
          fill="none"
          stroke="url(#mm-lock)"
          strokeWidth="4"
        />
        <path
          d="M60 14 100 34 100 71 60 104 20 71 20 34Z"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.4"
        />
        <g stroke="#18a8f5" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M34 66 C40 52 52 46 66 46 C78 46 86 52 90 60" />
          <path d="M34 66 L88 66" />
          <circle cx="48" cy="66" r="7" fill="#061423" />
          <circle cx="78" cy="66" r="7" fill="#061423" />
        </g>
        <path d="M64 46 L84 44" stroke="#f59e0b" strokeWidth="4.4" strokeLinecap="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span
          className="font-display text-[17px] font-extrabold tracking-tight"
          style={{ color: wordColor }}
        >
          MIDEEYE MOTORS
        </span>
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: subColor }}
        >
          & Rental Car Co.
        </span>
      </span>
    </span>
  );
}
