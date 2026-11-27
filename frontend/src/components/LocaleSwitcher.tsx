import { useI18n, useCurrency } from '@/context/LocaleContext';
import type { Currency } from '@/lib/money';

const CURRENCIES: Currency[] = ['USD', 'SOS'];

/**
 * Segmented display-currency (USD/SOS) switcher. `variant="light"`
 * styles it for dark surfaces (footer); the default suits the white navbar.
 */
export function LocaleSwitcher({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const { t } = useI18n();
  const { currency, setCurrency } = useCurrency();

  const wrap = variant === 'light' ? 'border-white/15 bg-white/5' : 'border-line bg-surface';
  const idle = variant === 'light' ? 'text-brand-100/70 hover:text-white' : 'text-ink-500 hover:text-navy-700';
  const activeCls = 'bg-brand-600 text-white';

  const seg = (isActive: boolean) =>
    'rounded-md px-2 py-1 text-[12px] font-bold transition-colors ' + (isActive ? activeCls : idle);

  return (
    <div className="flex items-center gap-2">
      <div className={'flex items-center gap-0.5 rounded-lg border p-0.5 ' + wrap} role="group" aria-label={t('switch.currency')}>
        {CURRENCIES.map((c) => (
          <button key={c} type="button" onClick={() => setCurrency(c)} aria-pressed={currency === c}
            className={seg(currency === c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
