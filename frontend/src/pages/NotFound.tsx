import { ButtonLink } from '@/components/ui/Button';
import { useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';

export default function NotFound() {
  const { t } = useI18n();
  useSeo({ title: '404 — Mideeye Motors' });
  return (
    <div className="grid min-h-[70vh] place-items-center bg-mist-100 px-5 text-center">
      <div>
        <div className="font-display text-[120px] font-extrabold leading-none text-gradient">404</div>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-navy-700">
          {t('notFound.title')}
        </h1>
        <p className="mt-3 text-ink-500">{t('notFound.sub')}</p>
        <ButtonLink to="/" className="mt-6">{t('common.backHome')}</ButtonLink>
      </div>
    </div>
  );
}
