import {
  ATTACHMENT_RATE_LIMIT,
  JOIN_RATE_LIMIT,
  TEXT_RATE_LIMIT,
} from '@shared/constants.js';
import { getRedisClient } from '../lib/redisClient.js';

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * In-memory token bucket, refilled continuously over `windowMs`. Used
 * directly when REDIS_URL isn't configured (local dev, or a single-instance
 * deployment that doesn't need cross-instance coordination) — this is the
 * original implementation, unchanged.
 */
class InMemoryTokenBucket {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly points: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.points, updatedAt: now };

    const elapsed = now - bucket.updatedAt;
    const refill = (elapsed / this.windowMs) * this.points;
    bucket.tokens = Math.min(this.points, bucket.tokens + refill);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      return false;
    }

    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return true;
  }

  delete(key: string): void {
    this.buckets.delete(key);
  }
}

/**
 * Distributed fixed-window counter backed by Redis (INCR + PEXPIRE), used
 * when REDIS_URL is set so a client can't dodge rate limits by landing on a
 * different server instance. Fixed-window semantics differ slightly from
 * the in-memory continuous-refill bucket above (a burst can land two
 * consecutive windows' worth of requests right at a window boundary), which
 * is the standard, well-understood trade-off for a Redis-backed limiter —
 * it still enforces "at most `points` actions per `windowMs`" per key.
 * Fails open (allows the action) on any Redis error, logging a warning,
 * rather than letting a Redis outage block chat entirely.
 */
class RedisFixedWindowLimiter {
  constructor(
    private readonly namespace: string,
    private readonly points: number,
    private readonly windowMs: number,
  ) {}

  private key(key: string): string {
    return `ratelimit:${this.namespace}:${key}`;
  }

  async consume(key: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return true;
    try {
      const redisKey = this.key(key);
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, this.windowMs);
      }
      return count <= this.points;
    } catch (err) {
       
      console.warn(`[rateLimit] Redis consume failed for ${this.namespace}, allowing:`, err);
      return true;
    }
  }

  async delete(key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await redis.del(this.key(key));
    } catch {
      // best-effort cleanup; the key will simply expire on its own TTL
    }
  }
}

const textBucket = new InMemoryTokenBucket(TEXT_RATE_LIMIT.points, TEXT_RATE_LIMIT.windowMs);
const attachmentBucket = new InMemoryTokenBucket(ATTACHMENT_RATE_LIMIT.points, ATTACHMENT_RATE_LIMIT.windowMs);
// Keyed by IP rather than socket id, and intentionally never cleared on
// disconnect - it must survive across reconnect attempts from the same IP.
const joinBucket = new InMemoryTokenBucket(JOIN_RATE_LIMIT.points, JOIN_RATE_LIMIT.windowMs);

const redisTextLimiter = new RedisFixedWindowLimiter('text', TEXT_RATE_LIMIT.points, TEXT_RATE_LIMIT.windowMs);
const redisAttachmentLimiter = new RedisFixedWindowLimiter(
  'attachment',
  ATTACHMENT_RATE_LIMIT.points,
  ATTACHMENT_RATE_LIMIT.windowMs,
);
const redisJoinLimiter = new RedisFixedWindowLimiter('join', JOIN_RATE_LIMIT.points, JOIN_RATE_LIMIT.windowMs);

export async function consumeTextToken(socketId: string): Promise<boolean> {
  return getRedisClient() ? redisTextLimiter.consume(socketId) : textBucket.consume(socketId);
}

export async function consumeAttachmentToken(socketId: string): Promise<boolean> {
  return getRedisClient() ? redisAttachmentLimiter.consume(socketId) : attachmentBucket.consume(socketId);
}

export async function consumeJoinToken(ip: string): Promise<boolean> {
  return getRedisClient() ? redisJoinLimiter.consume(ip) : joinBucket.consume(ip);
}

/** Called on leave/disconnect so per-socket buckets don't leak memory forever. */
export async function clearSocketRateLimits(socketId: string): Promise<void> {
  textBucket.delete(socketId);
  attachmentBucket.delete(socketId);
  if (getRedisClient()) {
    await Promise.all([redisTextLimiter.delete(socketId), redisAttachmentLimiter.delete(socketId)]);
  }
}
