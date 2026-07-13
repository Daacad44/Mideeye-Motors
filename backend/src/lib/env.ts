import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) {
    console.warn(`[env] Missing ${key} — using empty string`);
    return '';
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? '',
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cloudinary: {
    cloudName: required('CLOUDINARY_CLOUD_NAME'),
    apiKey: required('CLOUDINARY_API_KEY'),
    apiSecret: required('CLOUDINARY_API_SECRET'),
    folder: process.env.CLOUDINARY_FOLDER ?? 'mideeye-motors',
  },
};
