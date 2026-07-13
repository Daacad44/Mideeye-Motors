import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { Featured } from '@/components/home/Featured';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Categories } from '@/components/home/Categories';
import { Testimonials } from '@/components/home/Testimonials';
import { CTA } from '@/components/home/CTA';

export default function Home() {
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
