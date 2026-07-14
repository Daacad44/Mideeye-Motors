import { ArrowRight, Phone } from 'lucide-react';
import { ButtonLink } from '../ui/Button';

export function CTA() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 pb-24 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(118deg,#061423,#0d2b50_60%,#0b67c2)] px-6 py-16 text-center sm:px-16">
        <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 dotted-grid opacity-40" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold text-white sm:text-[40px]">
            Ready to command your next journey?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[17px] text-brand-100/80">
            Reserve a premium vehicle in minutes. Delivered spotless, fully insured
            and ready when you are.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <ButtonLink to="/booking" size="lg">
              Book a Car Now <ArrowRight className="size-4" />
            </ButtonLink>
            <a
              href="tel:+252612345678"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Phone className="size-4" /> +252 61 2345678
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
