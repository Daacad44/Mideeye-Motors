import { Logo } from './Logo';

/** Branded loading screen — uses the official logo, never a text stand-in. */
export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-mist-100">
      <div className="flex flex-col items-center gap-5">
        <div className="animate-pulse">
          <Logo height={60} />
        </div>
        <span className="size-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        <span className="text-sm font-semibold text-ink-400">{label}</span>
      </div>
    </div>
  );
}
