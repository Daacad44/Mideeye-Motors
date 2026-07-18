import { PageHeader } from '@/components/PageHeader';
import { useI18n } from '@/context/LocaleContext';
import { useSeo } from '@/lib/seo';

const UPDATED = 'July 2026';

export default function Privacy() {
  const { t } = useI18n();
  useSeo({ title: t('legal.privacyTitle'), description: t('legal.privacySub') });

  return (
    <div className="bg-mist-100">
      <PageHeader crumb={t('footer.privacy')} title={t('legal.privacyTitle')} subtitle={t('legal.privacySub')} />
      <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <article className="rounded-3xl border border-line bg-white p-7 shadow-[var(--shadow-soft)] lg:p-10">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">
            {t('legal.lastUpdated')}: {UPDATED}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            This Privacy Policy explains how Mideeye Motors &amp; Rental Car Co. collects, uses, and protects your
            personal information when you use our website and rental services.
          </p>

          <Section title="Information we collect">
            When you make a booking or create an account, we collect the details you give us — your name, email, phone
            number, and booking details (vehicle, dates, locations). For mobile-money payments we store the transaction
            reference you provide. We do not store card numbers or mobile-money PINs.
          </Section>

          <Section title="How we use your information">
            We use your information to process and confirm bookings, arrange delivery and pickup, verify payments,
            provide customer support, and send booking-related notifications by email and SMS. Aggregated, non-personal
            data may be used to improve our fleet and service.
          </Section>

          <Section title="Sharing">
            We do not sell your personal information. We share it only where necessary to deliver the service — for
            example with our delivery team — or where required by law. Our email is sent through a standard email
            provider and our images are served via an image CDN.
          </Section>

          <Section title="Data retention & security">
            We keep booking records for as long as needed to run our business and meet legal obligations. Passwords are
            stored hashed, and access to customer data is limited to authorised staff. While no system is perfectly
            secure, we take reasonable measures to protect your information.
          </Section>

          <Section title="Your choices">
            You can request access to, correction of, or deletion of your personal data by contacting us. You may opt
            out of non-essential messages at any time; essential booking notifications will still be sent while you have
            an active booking.
          </Section>

          <Section title="Contact">
            For any privacy question or request, email{' '}
            <a href="mailto:hello@mideeyemotors.com" className="font-bold text-brand-600 hover:underline">hello@mideeyemotors.com</a>{' '}
            or call +252 61 2345678.
          </Section>
        </article>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-navy-700">{title}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{children}</p>
    </section>
  );
}
