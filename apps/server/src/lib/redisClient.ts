import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let client: Redis | null | undefined;

/**
 * Lazily creates a single shared ioredis client from REDIS_URL, or returns
 * `null` when it isn't configured — callers fall back to in-memory state in
 * that case (see socket/rateLimit.ts). Never crashes the process: connection
 * errors are logged and callers are expected to fail open (allow the action)
 * rather than let a Redis outage take the whole chat down.
 */
export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  if (!env.redisUrl) {
    client = null;
    return client;
  }

  client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    // Retry the initial connection with backoff rather than throwing;
    // getRedisClient() itself never rejects.
    retryStrategy: (attempt: number) => Math.min(attempt * 500, 5000),
  });

  client.on('error', (err: Error) => {
     
    console.warn('[redis] connection error (rate limiting falls back to allow):', err.message);
  });

  return client;
}
