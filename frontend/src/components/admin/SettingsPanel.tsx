import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Phone, Receipt, Share2 } from 'lucide-react';
import { http } from '@/lib/http';
import { refreshBranding, useBranding } from '@/lib/branding';
import { useAuth } from '@/context/AuthContext';

const EXTRA_LABELS: Record<string, string> = {
  driver: 'Professional driver',
  childSeat: 'Child seat',
  wifi: 'Portable Wi-Fi',
  gps: 'GPS navigation',
};
const INSURANCE_LABELS: Record<string, string> = {
  basic: 'Basic',
  premium: 'Premium',
  full: 'Full protection',
};
const SOCIALS = [
  { id: 'facebook', label: 'Facebook URL' },
  { id: 'instagram', label: 'Instagram URL' },
  { id: 'tiktok', label: 'TikTok URL' },
  { id: 'twitter', label: 'X / Twitter URL' },
  { id: 'youtube', label: 'YouTube URL' },
];

const field =
  'w-full rounded-xl border border-line bg-inset px-3.5 py-2.5 text-[15px] font-medium text-navy-700 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none';
const label = 'mb-1.5 block text-[12.5px] font-bold uppercase tracking-wide text-ink-400';

type Status = { saving: boolean; saved: boolean; error: string | null };
const idle: Status = { saving: false, saved: false, error: null };

/**
 * Admin → Settings: the business contact details shown across the site, and
 * the rental prices for extras, insurance and tax. Changes apply immediately
 * (no deploy); the server re-prices every booking from these values.
 */
export function SettingsPanel() {
  const branding = useBranding();
  const { hasRole } = useAuth();
  const canPrice = hasRole('SUPER_ADMIN', 'ADMIN');

  const [contact, setContact] = useState({ phone: '', whatsapp: '', email: '', address: '' });
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [taxPct, setTaxPct] = useState('5');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [insurance, setInsurance] = useState<Record<string, string>>({});
  const [contactState, setContactState] = useState<Status>(idle);
  const [priceState, setPriceState] = useState<Status>(idle);
  const [loaded, setLoaded] = useState(false);

  // Fill the forms once the current settings arrive.
  useEffect(() => {
    if (loaded || !branding.pricing) return;
    setContact({ phone: branding.phone, whatsapp: branding.whatsapp, email: branding.email, address: branding.address });
    setSocials(branding.socials ?? {});
    setTaxPct(String(Math.round(branding.pricing.taxRate * 1000) / 10));
    setExtras(Object.fromEntries(Object.entries(branding.pricing.extras).map(([k, v]) => [k, String(v)])));
    setInsurance(Object.fromEntries(Object.entries(branding.pricing.insurance).map(([k, v]) => [k, String(v)])));
    setLoaded(true);
  }, [branding, loaded]);

  const save = async (body: object, set: (s: Status) => void) => {
    set({ saving: true, saved: false, error: null });
    try {
      await http('/branding', { method: 'PATCH', body: JSON.stringify(body) });
      await refreshBranding();
      set({ saving: false, saved: true, error: null });
      window.setTimeout(() => set(idle), 2500);
    } catch (e) {
      set({ saving: false, saved: false, error: (e as Error).message });
    }
  };

  const saveContact = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSocials = Object.fromEntries(Object.entries(socials).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    void save({ ...contact, socials: cleanSocials }, setContactState);
  };

  const toNumbers = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)]));
  const priceValues = [...Object.values(extras), ...Object.values(insurance)];
  const pricesValid =
    priceValues.every((v) => v.trim() !== '' && Number(v) >= 0) && taxPct.trim() !== '' && Number(taxPct) >= 0 && Number(taxPct) <= 50;

  const savePricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricesValid) return;
    void save(
      { taxRate: Math.round(Number(taxPct) * 10) / 1000, extrasPricing: toNumbers(extras), insurancePricing: toNumbers(insurance) },
      setPriceState,
    );
  };

  if (!loaded) {
    return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-ink-400" /></div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Contact */}
      <form onSubmit={saveContact} className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <Head icon={Phone} title="Business contact" sub="Shown in the header, footer, contact page and booking page." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="s-phone">Phone</label>
            <input id="s-phone" className={field} value={contact.phone} placeholder="+252 61 …" onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
          <div><label className={label} htmlFor="s-wa">WhatsApp</label>
            <input id="s-wa" className={field} value={contact.whatsapp} placeholder="+252 61 …" onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="s-email">Email</label>
            <input id="s-email" type="email" className={field} value={contact.email} placeholder="hello@…" onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="s-addr">Address</label>
            <input id="s-addr" className={field} value={contact.address} placeholder="Street, Mogadishu" onChange={(e) => setContact({ ...contact, address: e.target.value })} /></div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-[13px] font-bold text-navy-700"><Share2 className="size-4 text-brand-400" /> Social media</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <div key={s.id}><label className={label} htmlFor={`s-${s.id}`}>{s.label}</label>
              <input id={`s-${s.id}`} type="url" className={field} value={socials[s.id] ?? ''} placeholder="https://"
                onChange={(e) => setSocials({ ...socials, [s.id]: e.target.value })} /></div>
          ))}
        </div>
        <SaveBar state={contactState} />
      </form>

      {/* Pricing */}
      <form onSubmit={savePricing} className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <Head icon={Receipt} title="Rental pricing" sub="Extras and insurance are charged per day. Car prices are set per car in Fleet & prices." />
        <fieldset disabled={!canPrice} className="disabled:opacity-60">
          <div className="mt-5 max-w-[200px]"><label className={label} htmlFor="s-tax">Tax (%)</label>
            <input id="s-tax" type="number" inputMode="decimal" min="0" max="50" step="0.1" className={field} value={taxPct} onChange={(e) => setTaxPct(e.target.value)} /></div>

          <div className="mt-6 text-[13px] font-bold text-navy-700">Extras (USD / day)</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.keys(extras).map((id) => (
              <MoneyField key={id} id={`x-${id}`} label={EXTRA_LABELS[id] ?? id} value={extras[id]} onChange={(v) => setExtras({ ...extras, [id]: v })} />
            ))}
          </div>

          <div className="mt-6 text-[13px] font-bold text-navy-700">Insurance (USD / day)</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {Object.keys(insurance).map((id) => (
              <MoneyField key={id} id={`i-${id}`} label={INSURANCE_LABELS[id] ?? id} value={insurance[id]} onChange={(v) => setInsurance({ ...insurance, [id]: v })} />
            ))}
          </div>
        </fieldset>
        {!canPrice && <p className="mt-4 text-[13px] text-ink-400">Only an admin can change prices.</p>}
        {canPrice && !pricesValid && <p className="mt-4 text-[13px] text-red-400">Prices must be 0 or more, and tax between 0 and 50%.</p>}
        {canPrice && <SaveBar state={priceState} disabled={!pricesValid} />}
      </form>
    </div>
  );
}

function Head({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600/12 text-brand-400"><Icon className="size-5" /></span>
      <div>
        <h2 className="font-display text-lg font-bold text-navy-700">{title}</h2>
        <p className="text-[13px] text-ink-400">{sub}</p>
      </div>
    </div>
  );
}

function MoneyField({ id, label: text, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={label} htmlFor={id}>{text}</label>
      <div className="flex items-center rounded-xl border border-line bg-inset px-3 focus-within:border-brand-400">
        <span className="text-ink-400">$</span>
        <input id={id} type="number" inputMode="decimal" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-2.5 text-[15px] font-bold text-navy-700 focus:outline-none" />
      </div>
    </div>
  );
}

function SaveBar({ state, disabled }: { state: Status; disabled?: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
      <button type="submit" disabled={state.saving || disabled}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[14px] font-bold text-white hover:bg-brand-hover disabled:opacity-50">
        {state.saving && <Loader2 className="size-4 animate-spin" />} Save changes
      </button>
      {state.saved && <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-400"><CheckCircle2 className="size-4" /> Saved — live on the site</span>}
      {state.error && <span className="text-[13px] text-red-400">{state.error}</span>}
    </div>
  );
}
