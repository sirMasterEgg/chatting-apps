import 'dotenv/config';

function readEnv() {
  const port = Number(process.env.PORT ?? 4000);
  const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT env var: ${process.env.PORT}`);
  }

  return {
    port,
    clientOrigin,
    isProduction: process.env.NODE_ENV === 'production',
    // Optional. When set (e.g. to a Vercel Marketplace / Upstash Redis
    // `rediss://` URL), rate limiting becomes Redis-backed so it's enforced
    // consistently across multiple server instances. Never used for chat
    // content — messages and room membership stay in-memory only, per the
    // no-persistence design (see docs/issue-2.md). Falls back to the
    // existing in-memory limiter when unset.
    redisUrl: process.env.REDIS_URL || undefined,
  };
}

export const env = readEnv();
