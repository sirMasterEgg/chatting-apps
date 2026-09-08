import {
  ATTACHMENT_RATE_LIMIT,
  JOIN_RATE_LIMIT,
  TEXT_RATE_LIMIT,
} from '@shared/constants.js';

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/** Simple in-memory token bucket, refilled continuously over `windowMs`. */
class TokenBucket {
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

const textBucket = new TokenBucket(TEXT_RATE_LIMIT.points, TEXT_RATE_LIMIT.windowMs);
const attachmentBucket = new TokenBucket(ATTACHMENT_RATE_LIMIT.points, ATTACHMENT_RATE_LIMIT.windowMs);
// Keyed by IP rather than socket id, and intentionally never cleared on
// disconnect - it must survive across reconnect attempts from the same IP.
const joinBucket = new TokenBucket(JOIN_RATE_LIMIT.points, JOIN_RATE_LIMIT.windowMs);

export function consumeTextToken(socketId: string): boolean {
  return textBucket.consume(socketId);
}

export function consumeAttachmentToken(socketId: string): boolean {
  return attachmentBucket.consume(socketId);
}

export function consumeJoinToken(ip: string): boolean {
  return joinBucket.consume(ip);
}

/** Called on leave/disconnect so per-socket buckets don't leak memory forever. */
export function clearSocketRateLimits(socketId: string): void {
  textBucket.delete(socketId);
  attachmentBucket.delete(socketId);
}
