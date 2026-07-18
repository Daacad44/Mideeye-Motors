import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';

const FAQS = [
  {
    q: 'How do I book a car?',
    a: 'Browse the fleet, open a vehicle, choose your pickup and return dates, then complete the booking form. You’ll get a booking reference immediately and can pay right away or on pickup.',
  },
  {
    q: 'How do I pay?',
    a: 'We accept mobile money — EVC Plus, Zaad and other Somali mobile-money services. Pay the amount shown, then enter the transaction reference from your confirmation SMS. Our team verifies it and confirms your booking. All prices are charged in USD.',
  },
  {
    q: 'What is your cancellation policy?',
    a: 'Free cancellation up to 48 hours before pickup — no charge, no questions. Cancellations inside 48 hours may be subject to a one-day fee. Contact us as early as possible and we’ll do our best to help.',
  },
  {
    q: 'What are the driver requirements?',
    a: 'Drivers must be at least 21 years old and hold a valid driving licence. Please bring your licence and a government-issued ID (or passport) to pickup. A professional driver can be added to any booking as an extra.',
  },
  {
    q: 'Is insurance included?',
    a: 'Yes. Every rental includes basic insurance cover. You can upgrade to Premium (zero excess) or Full protection (zero excess plus tyres & glass) during checkout.',
  },
  {
    q: 'Do you deliver the car?',
    a: 'Yes — doorstep delivery is available across Mogadishu, and free on our Weekly and Monthly plans. Choose your pickup location during booking and we’ll bring the car to you, cleaned and fuelled.',
  },
  {
    q: 'Can I extend my rental?',
    a: 'Absolutely. Contact us before your return date and, subject to availability, we’ll extend your booking and adjust the total. Extensions are billed at your original daily rate.',
  },
  {
    q: 'What do I need at pickup?',
    a: 'Your booking reference, a valid driving licence, and a government-issued ID. If someone else is collecting the car on your behalf, let us know in advance.',
  },
];

export default function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  useSeo({ title: t('legal.faqTitle'), description: t('legal.faqSub') });

  return (
    <div className="bg-mist-100">
      <PageHeader crumb={t('footer.faq')} title={t('legal.faqTitle')} subtitle={t('legal.faqSub')} />
      <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-btn-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <span className="font-display text-[15.5px] font-bold text-navy-700">{item.q}</span>
                    <ChevronDown className={'size-5 shrink-0 text-brand-500 transition-transform ' + (isOpen ? 'rotate-180' : '')} aria-hidden />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  hidden={!isOpen}
                  className="px-5 pb-5 text-[14.5px] leading-relaxed text-ink-500"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-white p-6 text-center shadow-[var(--shadow-soft)]">
          <p className="text-[15px] font-semibold text-navy-700">Still have a question?</p>
          <p className="mt-1 text-[14px] text-ink-500">
            Reach us any time at <a href="mailto:hello@mideeyemotors.com" className="font-bold text-brand-600 hover:underline">hello@mideeyemotors.com</a> or +252 61 2345678.
          </p>
        </div>
      </div>
    </div>
  );
}
