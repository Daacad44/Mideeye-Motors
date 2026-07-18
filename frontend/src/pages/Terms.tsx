import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';

const UPDATED = 'July 2026';

export default function Terms() {
  const { t } = useI18n();
  useSeo({ title: t('legal.termsTitle'), description: t('legal.termsSub') });

  return (
    <div className="bg-mist-100">
      <PageHeader crumb={t('footer.terms')} title={t('legal.termsTitle')} subtitle={t('legal.termsSub')} />
      <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <article className="rounded-3xl border border-line bg-white p-7 shadow-[var(--shadow-soft)] lg:p-10">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">
            {t('legal.lastUpdated')}: {UPDATED}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            These Terms of Service govern your use of Mideeye Motors &amp; Rental Car Co. (“Mideeye Motors”, “we”, “us”)
            and any vehicle you rent from us. By booking a vehicle you agree to these terms. Please read them carefully.
          </p>

          <Section n="1" title="Eligibility & driver requirements">
            To rent a vehicle you must be at least 21 years old and hold a valid driving licence. You must present your
            licence and a government-issued ID or passport at pickup. The named driver on the booking is the only person
            authorised to drive unless we agree otherwise in writing.
          </Section>

          <Section n="2" title="Bookings & pricing">
            All prices are quoted and charged in US Dollars (USD). Prices shown in Somali Shillings (SOS) are a
            display-only conversion for reference and may differ from the amount charged. Your booking total, including
            any extras, insurance, taxes and discounts, is calculated and confirmed by us at the time of booking.
          </Section>

          <Section n="3" title="Payment">
            We accept mobile money (EVC Plus, Zaad and similar services). For mobile-money payments you provide the
            transaction reference, which we verify before confirming the booking. A booking is only confirmed once
            payment is received or explicitly agreed. Promotional codes are subject to their own conditions and may be
            withdrawn at any time.
          </Section>

          <Section n="4" title="Cancellation & changes">
            You may cancel free of charge up to 48 hours before your pickup time. Cancellations made within 48 hours of
            pickup may incur a charge of up to one rental day. To change your dates or extend a rental, contact us before
            the return date; changes are subject to availability and may adjust your total. No-shows may be charged in
            full.
          </Section>

          <Section n="5" title="Use of the vehicle">
            You agree to use the vehicle lawfully and with care, to keep it locked and secure, and not to sub-let it,
            use it for hire, race it, or drive it off sealed roads without our consent. Smoking is not permitted.
            Fuel is supplied at pickup and the vehicle should be returned with a comparable level.
          </Section>

          <Section n="6" title="Insurance & liability">
            Every rental includes basic insurance. Upgraded cover (Premium or Full protection) can be selected at
            checkout and reduces or removes your excess. You remain responsible for damage caused by negligence, driving
            under the influence, or use outside these terms. Personal belongings left in the vehicle are your
            responsibility.
          </Section>

          <Section n="7" title="Delivery & return">
            Where offered, we deliver and collect the vehicle at the location you choose. Please be available at the
            agreed time. Late returns may be charged at the daily rate. If the vehicle is returned damaged or
            excessively dirty, reasonable repair or cleaning fees may apply.
          </Section>

          <Section n="8" title="Contact">
            Questions about these terms? Email{' '}
            <a href="mailto:hello@mideeyemotors.com" className="font-bold text-brand-600 hover:underline">hello@mideeyemotors.com</a>{' '}
            or call +252 61 2345678. We may update these terms from time to time; the “last updated” date above always
            reflects the current version.
          </Section>
        </article>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-navy-700">
        <span className="text-brand-500">{n}.</span> {title}
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{children}</p>
    </section>
  );
}
