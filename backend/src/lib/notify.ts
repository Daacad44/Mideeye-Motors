import nodemailer from 'nodemailer';
import { env } from './env.js';
import { prisma } from './prisma.js';

/**
 * Notifications. Two channels behind a small provider interface so a real SMS
 * gateway (Twilio / a Somali provider) can be dropped in later without touching
 * callers. Email uses nodemailer over SMTP; if SMTP is unconfigured (no
 * SMTP_HOST) both channels fall back to console logging so dev/deploy never
 * crashes — the same fail-soft spirit as the ImageKit `configured` flag.
 */

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SmsInput {
  to: string;
  message: string;
}

const transporter = env.mail.configured
  ? nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465, // implicit TLS on 465, STARTTLS otherwise
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    })
  : null;

/** Send an email (or log it when SMTP is unconfigured). */
export async function sendEmail({ to, subject, html }: EmailInput): Promise<void> {
  if (!transporter) {
    console.log(`[notify:email] (console fallback — SMTP not configured) to=${to} · subject="${subject}"`);
    return;
  }
  await transporter.sendMail({ from: env.mail.from, to, subject, html });
}

/**
 * Send an SMS. No provider is wired yet — this logs the message so nothing
 * depends on a gateway. Swap this body for a real provider (via env vars)
 * without changing any caller.
 */
export async function sendSms({ to, message }: SmsInput): Promise<void> {
  console.log(`[notify:sms] (console stub — no SMS provider configured) to=${to} · message="${message}"`);
}

// ── Templates / higher-level triggers ─────────────────────────────────────
// Each is best-effort: it never throws into the request path (like audit()).

const money = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

const day = (d: Date | string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

export interface BookingNotice {
  reference: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  vehicleTitle?: string | null;
  total: number;
  pickupDate: Date | string;
  returnDate: Date | string;
}

/**
 * The official logo's public URL for the email header, resolved from the
 * Branding singleton. Best-effort — falls back to a text wordmark header if it
 * can't be read. Does not touch the frontend branding fetch / ImageKit logic.
 */
async function brandingLogoUrl(): Promise<string | null> {
  try {
    const b = await prisma.branding.findUnique({ where: { id: 'default' }, select: { logo: { select: { url: true } } } });
    return b?.logo?.url ?? null;
  } catch {
    return null;
  }
}

function shell(heading: string, bodyRows: string, logoUrl: string | null): string {
  // Logo on a white band (the logo's own colours read on white); otherwise a
  // navy wordmark bar. `height` fixes the size; width auto keeps its ratio.
  const header = logoUrl
    ? `<div style="background:#fff;padding:18px 24px;border-bottom:1px solid #e6edf5;text-align:center"><img src="${logoUrl}" alt="Mideeye Motors &amp; Rental Car Co." height="40" style="height:40px;width:auto;display:inline-block" /></div>`
    : `<div style="background:#143a68;padding:20px 24px;color:#fff;font-weight:800;font-size:18px">Mideeye Motors</div>`;
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f7f9fc;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6edf5;border-radius:16px;overflow:hidden">
      ${header}
      <div style="padding:24px">
        <h1 style="margin:0 0 8px;font-size:20px;color:#143a68">${heading}</h1>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b">${bodyRows}</table>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e6edf5;color:#7a8aa0;font-size:12px">Mideeye Motors &amp; Rental Car Co.</div>
    </div>
  </div>`;
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 0;color:#7a8aa0">${label}</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#143a68">${value}</td></tr>`;

function bookingRows(b: BookingNotice): string {
  return (
    row('Reference', b.reference) +
    (b.vehicleTitle ? row('Vehicle', b.vehicleTitle) : '') +
    row('Pickup', day(b.pickupDate)) +
    row('Return', day(b.returnDate)) +
    row('Total', money(b.total))
  );
}

/** Booking created — acknowledgement to the customer. */
export async function notifyBookingReceived(b: BookingNotice): Promise<void> {
  try {
    const html = shell(
      'Booking received',
      `<tr><td colspan="2" style="padding-bottom:10px;color:#1e293b">Hi ${b.customerName ?? 'there'}, we’ve received your booking and it’s awaiting confirmation.</td></tr>` +
        bookingRows(b),
      await brandingLogoUrl(),
    );
    if (b.customerEmail) await sendEmail({ to: b.customerEmail, subject: `Booking received — ${b.reference}`, html });
    if (b.customerPhone) await sendSms({ to: b.customerPhone, message: `Mideeye Motors: booking ${b.reference} received (${money(b.total)}). We’ll confirm shortly.` });
  } catch (err) {
    console.warn('[notify] notifyBookingReceived failed:', (err as Error).message);
  }
}

/** Booking confirmed (payment verified / status set to CONFIRMED). */
export async function notifyBookingConfirmed(b: BookingNotice): Promise<void> {
  try {
    const html = shell(
      'Booking confirmed ✅',
      `<tr><td colspan="2" style="padding-bottom:10px;color:#1e293b">Hi ${b.customerName ?? 'there'}, your booking is confirmed. See you at pickup!</td></tr>` +
        bookingRows(b),
      await brandingLogoUrl(),
    );
    if (b.customerEmail) await sendEmail({ to: b.customerEmail, subject: `Booking confirmed — ${b.reference}`, html });
    if (b.customerPhone) await sendSms({ to: b.customerPhone, message: `Mideeye Motors: booking ${b.reference} is CONFIRMED. See you at pickup!` });
  } catch (err) {
    console.warn('[notify] notifyBookingConfirmed failed:', (err as Error).message);
  }
}

/** Password reset link. */
export async function notifyPasswordReset(input: { to: string; name?: string | null; link: string }): Promise<void> {
  try {
    const html = shell(
      'Reset your password',
      `<tr><td colspan="2" style="color:#1e293b;padding-bottom:12px">Hi ${input.name ?? 'there'}, we received a request to reset your password. This link expires in 1 hour and can be used once.</td></tr>` +
        `<tr><td colspan="2"><a href="${input.link}" style="display:inline-block;background:#0b67c2;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">Reset password</a></td></tr>` +
        `<tr><td colspan="2" style="color:#7a8aa0;padding-top:12px;font-size:12px">If you didn’t request this, you can safely ignore this email.</td></tr>`,
      await brandingLogoUrl(),
    );
    await sendEmail({ to: input.to, subject: 'Reset your Mideeye Motors password', html });
  } catch (err) {
    console.warn('[notify] notifyPasswordReset failed:', (err as Error).message);
  }
}
