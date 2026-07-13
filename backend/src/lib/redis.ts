import Redis from 'ioredis';
import { env } from './env.js';

/**
 * Optional Redis cache. If REDIS_URL is unset or unreachable, the helpers
 * degrade to no-ops so the API keeps working without Redis in development.
 */
let client: Redis | null = null;

if (env.redisUrl) {
  client = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 2 ? null : 200),
  });
  client.on('error', () => {
    /* swallow — cache is best-effort */
  });
  client.connect().catch(() => {
    client = null;
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function cacheInvalidate(pattern: string) {
  if (!client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length) await client.del(keys);
  } catch {
    /* ignore */
  }
}
