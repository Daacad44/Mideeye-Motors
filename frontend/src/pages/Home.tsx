import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { Featured } from '@/components/home/Featured';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Categories } from '@/components/home/Categories';
import { Testimonials } from '@/components/home/Testimonials';
import { CTA } from '@/components/home/CTA';
import { useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';

export default function Home() {
  const { t } = useI18n();
  useSeo({
    title: 'Mideeye Motors — Premium Car Rental in Somalia',
    description: t('hero.subtitle'),
    image: `${window.location.origin}/pwa-512x512.png`,
  });
  return (
    <>
      <Hero />
      <TrustStrip />
      <Featured />
      <HowItWorks />
      <Categories />
      <Testimonials />
      <CTA />
    </>
  );
}
