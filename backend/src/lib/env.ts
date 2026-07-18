import 'dotenv/config';
import { z } from 'zod';

/**
 * Fail-fast, validated environment. ImageKit credentials are server-side
 * only — the frontend never receives the private key, only the public key
 * + URL endpoint (safe to expose, needed to build/authenticate uploads).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default(''),

  JWT_SECRET: z.string().min(1).default('dev-secret-change-me'),
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
  MAIL_FROM: z.string().default('Mideeye Motors <no-reply@mideeyemotors.com>'),

  // ── Seed accounts (idempotent; env-overridable per deployment) ──
  SEED_ADMIN_EMAIL: z.string().email().default('admin@mideeyemotors.com'),
  SEED_ADMIN_PASSWORD: z.string().min(6).default('admin1234'),
  SEED_SUPER_ADMIN_EMAIL: z.string().email().default('daacaddeveloper@gmail.com'),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(6).default('Daacad@44Xxv'),
});

const parsed = schema.safeParse(process.env);

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

// In development, fall back to permissive defaults so `npm run dev` still
// boots for unrelated work (vehicles/auth) without real ImageKit creds;
// media upload routes will return a clear error until they're set.
const data = parsed.success
  ? parsed.data
  : schema.parse({
      ...process.env,
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
  seed: {
    adminEmail: data.SEED_ADMIN_EMAIL,
    adminPassword: data.SEED_ADMIN_PASSWORD,
    superAdminEmail: data.SEED_SUPER_ADMIN_EMAIL,
    superAdminPassword: data.SEED_SUPER_ADMIN_PASSWORD,
  },
};
