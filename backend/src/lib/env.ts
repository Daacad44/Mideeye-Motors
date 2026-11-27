import 'dotenv/config';
import { z } from 'zod';

/**
 * Fail-fast, validated environment. ImageKit credentials are server-side
 * only — the frontend never receives the private key, only the public key
 * + URL endpoint (safe to expose, needed to build/authenticate uploads).
 */
const DEV_JWT_SECRET = 'dev-secret-change-me';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default(''),

  JWT_SECRET: z.string().min(1).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // ── ImageKit (server-side only, except the two VITE_ mirrors below) ──
  IMAGEKIT_PUBLIC_KEY: z.string().min(1, 'IMAGEKIT_PUBLIC_KEY is required'),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1, 'IMAGEKIT_PRIVATE_KEY is required'),
  IMAGEKIT_URL_ENDPOINT: z.string().url().default('https://ik.imagekit.io/unset'),

  // ── Public site URL (used to build password-reset links) ──
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // ── SMTP / email (all optional; unset ⇒ notifications log to console) ──
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Daljir Rental Car <no-reply@daljirrentalcar.com>'),

  // ── SMS (optional; unset ⇒ messages log to console). Provider: Twilio. ──
  SMS_PROVIDER: z.enum(['console', 'twilio']).default('console'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM: z.string().optional().default(''),

  // ── Payments ──
  // The `mock` provider marks a booking PAID instantly with no money moving.
  // It is always off in production unless this is explicitly set to "true"
  // (e.g. a staging server); in development it is on by default.
  PAYMENTS_ALLOW_MOCK: z.enum(['true', 'false']).optional(),

  // ── WaafiPay (EVC Plus, ZAAD, SAHAL, WAAFI push-to-phone). All three
  // credentials come from the WaafiPay merchant portal; unset ⇒ disabled. ──
  WAAFIPAY_MERCHANT_UID: z.string().optional().default(''),
  WAAFIPAY_API_USER_ID: z.string().optional().default(''),
  WAAFIPAY_API_KEY: z.string().optional().default(''),
  // Production by default; point at the sandbox while testing.
  WAAFIPAY_API_URL: z.string().url().default('https://api.waafipay.net/asm'),
});

// Treat `FOO=""` (common in .env files and compose `${FOO:-}`) as unset so
// the defaults above apply instead of failing validation.
const rawEnv = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));

const parsed = schema.safeParse(rawEnv);

if (!parsed.success) {
  // Fail fast and loud — a missing ImageKit/DB var should never surface
  // later as an opaque 500 during a request.
  console.error('❌ Invalid/missing environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  }
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const isProduction = process.env.NODE_ENV === 'production';

// Never run production with the well-known development JWT secret: anyone who
// knows it could mint an admin token.
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('❌ JWT_SECRET must be set to a random string of at least 32 characters in production.');
  console.error('   Generate one with: openssl rand -hex 32');
  process.exit(1);
}

// In development, fall back to permissive defaults so `npm run dev` still
// boots for unrelated work (vehicles/auth) without real ImageKit creds;
// media upload routes will return a clear error until they're set.
const data = parsed.success
  ? parsed.data
  : schema.parse({
      ...rawEnv,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://invalid/invalid',
      IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY || 'unset',
      IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || 'unset',
    });

export const env = {
  nodeEnv: data.NODE_ENV,
  port: data.PORT,
  corsOrigin: data.CORS_ORIGIN,
  databaseUrl: data.DATABASE_URL,
  redisUrl: data.REDIS_URL,
  jwtSecret: data.JWT_SECRET,
  jwtExpiresIn: data.JWT_EXPIRES_IN,
  frontendUrl: data.FRONTEND_URL,
  mail: {
    host: data.SMTP_HOST,
    port: data.SMTP_PORT,
    user: data.SMTP_USER,
    pass: data.SMTP_PASS,
    from: data.MAIL_FROM,
    // Like the ImageKit flag: no SMTP host ⇒ fall back to console logging.
    configured: data.SMTP_HOST !== '',
  },
  imagekit: {
    publicKey: data.IMAGEKIT_PUBLIC_KEY,
    privateKey: data.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: data.IMAGEKIT_URL_ENDPOINT,
    configured: data.IMAGEKIT_PUBLIC_KEY !== 'unset' && data.IMAGEKIT_PRIVATE_KEY !== 'unset',
  },
  sms: {
    provider: data.SMS_PROVIDER,
    twilio: {
      accountSid: data.TWILIO_ACCOUNT_SID,
      authToken: data.TWILIO_AUTH_TOKEN,
      from: data.TWILIO_FROM,
    },
  },
  payments: {
    allowMock:
      data.PAYMENTS_ALLOW_MOCK === 'true' ||
      (data.PAYMENTS_ALLOW_MOCK === undefined && data.NODE_ENV !== 'production'),
    waafipay: {
      merchantUid: data.WAAFIPAY_MERCHANT_UID,
      apiUserId: data.WAAFIPAY_API_USER_ID,
      apiKey: data.WAAFIPAY_API_KEY,
      apiUrl: data.WAAFIPAY_API_URL,
      configured: Boolean(data.WAAFIPAY_MERCHANT_UID && data.WAAFIPAY_API_USER_ID && data.WAAFIPAY_API_KEY),
    },
  },
};
