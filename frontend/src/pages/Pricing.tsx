import { PageHeader } from '@/components/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Daily',
    price: 55,
    unit: '/ day',
    desc: 'Perfect for short trips and errands.',
    features: ['Unlimited mileage', 'Basic insurance', '24/7 support', 'Free cancellation'],
    highlight: false,
  },
  {
    name: 'Weekly',
    price: 350,
    unit: '/ week',
    desc: 'Our most popular flexible plan.',
    features: ['Everything in Daily', 'Premium insurance', 'Free doorstep delivery', 'One free driver day', 'Priority vehicle choice'],
    highlight: true,
  },
  {
    name: 'Monthly',
    price: 1350,
    unit: '/ month',
    desc: 'Best value for long-term needs.',
    features: ['Everything in Weekly', 'Full protection cover', 'Free maintenance & swaps', 'Dedicated account manager', 'Corporate invoicing'],
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="bg-mist-100">
      <PageHeader crumb="Pricing" title="Simple, transparent pricing" subtitle="No hidden fees. Choose the plan that fits your journey — starting from just $55." />
      <div className="mx-auto max-w-[1360px] px-5 py-20 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} index={i}>
              <div
                className={
                  'relative flex h-full flex-col rounded-3xl border p-8 shadow-[var(--shadow-soft)] ' +
                  (p.highlight
                    ? 'border-transparent bg-[linear-gradient(160deg,#0d2b50,#08182f)] text-white shadow-[var(--shadow-lift)]'
                    : 'border-line bg-white')
                }
              >
                {p.highlight && (
                  <span className="absolute right-6 top-6 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Popular
                  </span>
                )}
                <h3 className={'font-display text-xl font-bold ' + (p.highlight ? 'text-white' : 'text-navy-700')}>
                  {p.name}
                </h3>
                <p className={'mt-1 text-[14px] ' + (p.highlight ? 'text-brand-100/70' : 'text-ink-400')}>{p.desc}</p>
                <div className="mt-5">
                  <span className={'font-display text-5xl font-extrabold ' + (p.highlight ? 'text-white' : 'text-navy-700')}>
                    ${p.price}
                  </span>
                  <span className={p.highlight ? 'text-brand-100/70' : 'text-ink-400'}> {p.unit}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className={'flex items-center gap-3 text-[14.5px] ' + (p.highlight ? 'text-brand-100/90' : 'text-navy-700')}>
                      <span className={'grid size-5 place-items-center rounded-full ' + (p.highlight ? 'bg-amber-500 text-white' : 'bg-brand-100 text-brand-600')}>
                        <Check className="size-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  to="/booking"
                  variant={p.highlight ? 'primary' : 'secondary'}
                  className="mt-8 w-full"
                >
                  Get Started
                </ButtonLink>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
