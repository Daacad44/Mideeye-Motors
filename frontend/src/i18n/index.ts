import { en, type Dictionary } from './en';

/** The site is English-only. */
export type Locale = 'en';
export type { Dictionary };

function lookup(dict: Dictionary, key: string): string | undefined {
  // Dot-path lookup: 'nav.fleet' → dict.nav.fleet
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict) as
    | string
    | undefined;
}

/** Translate a dot-path key, falling back to the key itself. `{name}` vars are interpolated. */
export function translate(_locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}
