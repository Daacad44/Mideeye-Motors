import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, type Locale } from '@/i18n';
import { formatMoney, USD_TO_SOS, type Currency } from '@/lib/money';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number;
  money: (amountUsd: number) => string;
}

const LocaleContext = createContext<LocaleState | null>(null);

const readLocale = (): Locale => {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem('mm_locale') : null;
  return v === 'en' || v === 'so' ? v : 'so'; // default to Somali for this market
};
const readCurrency = (): Currency => {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem('mm_currency') : null;
  return v === 'SOS' || v === 'USD' ? v : 'USD'; // default USD (the charged currency)
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);
  const [currency, setCurrencyState] = useState<Currency>(readCurrency);
  const rate = USD_TO_SOS;

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('mm_locale', l);
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
    <LocaleContext.Provider value={{ locale, setLocale, t, currency, setCurrency, rate, money }}>
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
  const { t, locale, setLocale } = useLocaleContext();
  return { t, locale, setLocale };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const { currency, setCurrency, rate, money } = useLocaleContext();
  return { currency, setCurrency, rate, money };
}
