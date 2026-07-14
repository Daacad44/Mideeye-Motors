import 'express-async-errors'; // routes async errors to the error handler (must be first)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { authRouter } from './routes/auth.js';
import { uploadRouter } from './routes/upload.js';
import { bookingsRouter } from './routes/bookings.js';
import { mediaRouter } from './routes/media.js';
import { adminRouter } from './routes/admin.js';
import { brandingRouter } from './routes/branding.js';

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
app.use('/api/media', mediaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/bookings', bookingsRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: Error & { status?: number; statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  console.error('[error]', err.message);
  if (res.headersSent) return;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status >= 500 || !err.message ? 'Internal server error' : err.message,
  });
});

// Last-resort guards so a stray rejection never takes the server down.
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

app.listen(env.port, () => {
  console.log(`🚗 Mideeye Motors API running on http://localhost:${env.port}`);
});
