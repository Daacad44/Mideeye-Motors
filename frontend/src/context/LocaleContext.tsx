import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, type Locale } from '@/i18n';
import { formatMoney, USD_TO_SOS, type Currency } from '@/lib/money';

interface LocaleState {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number;
  money: (amountUsd: number) => string;
}

const LocaleContext = createContext<LocaleState | null>(null);

const readCurrency = (): Currency => {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem('mm_currency') : null;
  return v === 'SOS' || v === 'USD' ? v : 'USD'; // default USD (the charged currency)
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale: Locale = 'en';
  const [currency, setCurrencyState] = useState<Currency>(readCurrency);
  const rate = USD_TO_SOS;

  useEffect(() => {
    document.documentElement.lang = 'en';
    try { localStorage.removeItem('mm_locale'); } catch { /* storage unavailable */ }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('mm_currency', c);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
  const money = useCallback((amountUsd: number) => formatMoney(amountUsd, { currency, rate }), [currency, rate]);

  return (
    <LocaleContext.Provider value={{ locale, t, currency, setCurrency, rate, money }}>
      {children}
    </LocaleContext.Provider>
  );
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useI18n/useCurrency must be used within LocaleProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const { t, locale } = useLocaleContext();
  return { t, locale };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const { currency, setCurrency, rate, money } = useLocaleContext();
  return { currency, setCurrency, rate, money };
}
