import { Hero } from '@/components/home/Hero';
import { SpecStrip } from '@/components/home/SpecStrip';
import { Categories } from '@/components/home/Categories';
import { Featured } from '@/components/home/Featured';
import { Spotlight } from '@/components/home/Spotlight';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TrustStrip } from '@/components/home/TrustStrip';
import { CTA } from '@/components/home/CTA';
import { useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';

export default function Home() {
  const { t } = useI18n();
  useSeo({
    title: 'Daljir Rental Car — Premium car rental in Somalia',
    description: t('home.heroSub'),
    image: `${window.location.origin}/images/fleet/toyota-prado-tx/front-three-quarter.webp`,
  });
  return (
    <>
      <Hero />
      <SpecStrip />
      <Categories />
      <Featured />
      <Spotlight />
      <HowItWorks />
      <TrustStrip />
      <CTA />
    </>
  );
}
