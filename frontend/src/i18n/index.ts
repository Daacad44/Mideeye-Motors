import { en, type Dictionary } from './en';
import { so } from './so';

export type Locale = 'en' | 'so';
export type { Dictionary };

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'so', label: 'SO' },
  { id: 'en', label: 'EN' },
];

export const dictionaries: Record<Locale, Dictionary> = { en, so };

function lookup(dict: Dictionary, key: string): string | undefined {
  // Dot-path lookup: 'nav.fleet' → dict.nav.fleet
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict) as
    | string
    | undefined;
}

/** Translate a dot-path key, falling back to English then the key itself. `{name}` vars are interpolated. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(dictionaries.en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}
