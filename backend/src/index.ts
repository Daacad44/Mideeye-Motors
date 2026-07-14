import express from 'express';
import cors from 'cors';
import { env } from './lib/env.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { authRouter } from './routes/auth.js';
import { uploadRouter } from './routes/upload.js';
import { bookingsRouter } from './routes/bookings.js';

const app = express();

app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'mideeye-motors-api', time: new Date().toISOString() }),
);

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/bookings', bookingsRouter);

// 404 + error handlers
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`🚗 Mideeye Motors API running on http://localhost:${env.port}`);
});
