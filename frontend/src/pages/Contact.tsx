import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

const info = [
  { icon: Phone, label: 'Phone', value: '+252 61 2345678' },
  { icon: Mail, label: 'Email', value: 'hello@mideeyemotors.com' },
  { icon: MapPin, label: 'Address', value: 'Maka Al-Mukarama Rd, Mogadishu' },
  { icon: Clock, label: 'Hours', value: 'Open 24/7' },
];

export default function Contact() {
  const [sent, setSent] = useState(false);
  const field = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-medium text-navy-700 focus:border-brand-400 focus:outline-none';
  const label = 'mb-1.5 block text-[13px] font-bold text-navy-700';

  return (
    <div className="bg-mist-100">
      <PageHeader crumb="Contact" title="Let’s talk" subtitle="Questions, bookings or corporate enquiries — our team is here around the clock." />
      <div className="mx-auto max-w-[1360px] px-5 py-20 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            {info.map((it) => (
              <div key={it.label} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
                <span className="grid size-12 place-items-center rounded-xl bg-brand-100 text-brand-600">
                  <it.icon className="size-5" />
                </span>
                <div>
                  <div className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-400">{it.label}</div>
                  <div className="font-bold text-navy-700">{it.value}</div>
                </div>
              </div>
            ))}
            <div className="overflow-hidden rounded-2xl border border-line">
              <iframe
                title="Mideeye Motors location"
                src="https://www.openstreetmap.org/export/embed.html?bbox=45.30%2C2.02%2C45.38%2C2.08&layer=mapnik"
                className="h-52 w-full"
                loading="lazy"
              />
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="rounded-3xl border border-line bg-white p-8 shadow-[var(--shadow-soft)]"
          >
            {sent ? (
              <div className="grid h-full place-items-center py-16 text-center">
                <div>
                  <h3 className="font-display text-2xl font-extrabold text-navy-700">Message sent!</h3>
                  <p className="mt-2 text-ink-500">We’ll get back to you within a few hours.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className={label}>Name</label><input className={field} required placeholder="Your name" /></div>
                  <div><label className={label}>Email</label><input type="email" className={field} required placeholder="you@email.com" /></div>
                </div>
                <div className="mt-4"><label className={label}>Subject</label><input className={field} defaultValue="Booking enquiry" /></div>
                <div className="mt-4"><label className={label}>Message</label><textarea className={field + ' min-h-32 resize-y'} placeholder="How can we help?" /></div>
                <Button type="submit" size="lg" className="mt-6 w-full">Send Message</Button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
