import { ShieldCheck, UserRound, Smartphone, BellRing } from 'lucide-react';
import { useI18n } from '@/context/LocaleContext';

const ITEMS = [
  { icon: ShieldCheck, key: 'Insurance' },
  { icon: UserRound, key: 'Driver' },
  { icon: Smartphone, key: 'Waafi' },
  { icon: BellRing, key: 'Confirm' },
] as const;

export function TrustStrip() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-16 sm:px-6">
      <ul className="m-0 grid list-none grid-cols-1 gap-4 rounded-[22px] border border-white/8 bg-inset p-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600/12 text-brand-400">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-white">{t(`home.trust${key}`)}</span>
              <span className="block text-sm text-ink-400">{t(`home.trust${key}Sub`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
