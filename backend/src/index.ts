import 'express-async-errors'; // routes async errors to the error handler (must be first)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { env } from './lib/env.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { authRouter } from './routes/auth.js';
import { bookingsRouter } from './routes/bookings.js';
import { adminMediaRouter } from './routes/adminMedia.js';
import { adminRouter } from './routes/admin.js';
import { brandingRouter } from './routes/branding.js';
import { uploadRouter } from './routes/upload.js';

const app = express();

app.set('trust proxy', 1);

// ── Security headers ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // API only; the SPA sets its own CSP at the edge
  }),
);

// ── CORS (credentials for the refresh cookie) ──
const origins = env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((o) => o.trim());
app.use(cors({ origin: origins, credentials: true }));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ── Rate limiting ──
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'mideeye-motors-api', time: new Date().toISOString() }),
);

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/branding', brandingRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin/media', adminMediaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/bookings', bookingsRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: Error & { status?: number; statusCode?: number; code?: string }, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Malformed uploads (wrong field name, oversized file, too many files) are
  // a client mistake, not a server fault — surface as 400 with a clear reason.
  if (err instanceof multer.MulterError) {
    console.warn(`[400] ${req.method} ${req.originalUrl} — ${err.code}: ${err.message}`);
    return res.status(400).json({ error: `Upload rejected: ${err.message}` });
  }
  const status = err.status ?? err.statusCode ?? 500;
  // Log the REAL exception server-side: message, Prisma code, and full stack
  // (the stack's first frame shows the source file + line number).
  if (status >= 500) {
    console.error(
      `\n[500] ${req.method} ${req.originalUrl}\n` +
        `  name:    ${err.name}\n` +
        `  message: ${err.message}\n` +
        (err.code ? `  code:    ${err.code}\n` : '') +
        `  stack:\n${err.stack}\n`,
    );
  } else {
    console.warn(`[${status}] ${req.method} ${req.originalUrl} — ${err.message}`);
  }
  if (res.headersSent) return;
  // Clients still get a safe message; details stay in the server logs.
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status >= 500 || !err.message ? 'Internal server error' : err.message,
  });
});

// Last-resort guards so a stray rejection never takes the server down.
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

if (!env.imagekit.configured) {
  console.warn('[imagekit] IMAGEKIT_PUBLIC_KEY/IMAGEKIT_PRIVATE_KEY not set — media uploads disabled until configured.');
}

app.listen(env.port, () => {
  console.log(`🚗 Mideeye Motors API running on http://localhost:${env.port}`);
});
