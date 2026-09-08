# Deployment

This app splits across two very different runtime shapes, so it deploys as
two separate services:

| Service | What it is | Where it goes |
|---|---|---|
| `apps/client` | Static Vite build (React SPA) | **Vercel**, via Turborepo |
| `apps/server` | Stateful Express + Socket.IO process | Any host that runs a persistent Node process (Docker image provided) |

## Why the server isn't on Vercel too

`apps/server` holds every room's users, typing state, and rate-limit
counters in the memory of **one running process**, and each client keeps a
**persistent** WebSocket connection open to it — that's the entire point of
the no-persistence design (see the root `README.md`). Vercel Functions are
stateless, short-lived, and don't keep a WebSocket connection alive across
invocations, and a Vercel deployment can run multiple instances of a
function with no shared memory between them. Deploying this server there
would silently break realtime delivery and room membership. Any host that
runs a normal, long-lived Node process — Railway, Render, Fly.io, a plain
VPS, your own Docker host — works fine; a `Dockerfile` is provided so you
can deploy to whichever of those you prefer.

## 1. Client on Vercel (Turborepo)

`apps/client/vercel.json` is already set up to build through Turborepo:

```json
{
  "framework": "vite",
  "installCommand": "cd ../.. && npm install",
  "buildCommand": "cd ../.. && npx turbo run build --filter=@app/client",
  "outputDirectory": "dist"
}
```

Steps in the Vercel dashboard:

1. **New Project** → import this repo.
2. **Root Directory**: set to `apps/client`. Vercel detects the monorepo
   (`turbo.json` at the repo root) and installs from the workspace root
   automatically; the `installCommand`/`buildCommand` above are explicit
   just so the build is reproducible regardless of Vercel's zero-config
   defaults.
3. **Environment Variables**: add `VITE_SERVER_URL` set to your deployed
   server's public URL (e.g. `https://chat-server.example.com`) — this is
   read at build time by Vite, so it must be set before deploying, not
   just at runtime.
4. Deploy. Every push rebuilds via `turbo run build --filter=@app/client`,
   which only touches `apps/client` (and `packages/shared`, which it
   depends on) — the server workspace is never built here.

Optional: enable Vercel's **Remote Caching** for Turborepo
(`npx turbo login` / `npx turbo link` locally, or connect it from the
Vercel project settings) so CI and local builds share the cache.

## 2. Server on a persistent host (Docker)

Build context is the **repo root** (an npm-workspaces monorepo needs the
whole workspace graph to install):

```bash
docker build -f apps/server/Dockerfile -t chat-server .
docker run -p 4000:4000 \
  -e CLIENT_ORIGIN=https://your-vercel-app.vercel.app \
  -e PORT=4000 \
  chat-server
```

The image is a two-stage Alpine build: install + `turbo run build
--filter=@app/server` in the builder stage, then a production-only
`npm ci --omit=dev` for just `@app/server` + `@shared/root` in the runtime
stage, running the compiled output directly with plain `node` (no `tsx`).
Verified locally end-to-end (health check + a real two-client Socket.IO
session) before committing.

Any platform that accepts a Dockerfile or a generic Node buildpack works:

- **Railway / Render / Fly.io**: point them at this Dockerfile, or use
  their Node buildpack with build command `npm ci && npx turbo run build
  --filter=@app/server` and start command `node
  apps/server/dist/apps/server/src/index.js` run from the repo root.
- **Plain VPS**: same two commands, behind a reverse proxy (nginx/Caddy)
  that forwards to `PORT` and passes through WebSocket upgrades.

### Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no (defaults to 4000) | Some platforms (Railway, Render) inject this themselves |
| `CLIENT_ORIGIN` | **yes** | Must exactly match your deployed client's origin — CORS rejects everything else |
| `REDIS_URL` | no | See below |

## 3. Optional: Redis for distributed rate limiting

Rate limiting (`apps/server/src/socket/rateLimit.ts`) is in-memory by
default — fine for a single instance. If you run multiple server replicas
behind a load balancer, set `REDIS_URL` so rate limits are enforced
consistently across all of them instead of resetting per-instance.

**This is the only thing Redis is used for.** Room membership, typing
state, and messages are never written to Redis (or anywhere) — the
no-persistence guarantee ("restarting the server drops every room and
message, with nothing left on disk") is unaffected either way.

To provision it via **Vercel's Marketplace Redis** (Upstash):

1. In the Vercel dashboard: **Storage** → **Create Database** → **Redis**
   (Upstash). This can be created independently of the client project — it
   doesn't need to live in the same Vercel project, since the server itself
   isn't deployed on Vercel.
2. Copy the connection string it gives you (a `rediss://` URL).
3. Set it as `REDIS_URL` on whatever platform hosts `apps/server` (Railway/
   Render/Fly/your VPS's env) — **not** as a Vercel env var, since Vercel
   only hosts the client here.

Any other standard Redis works the same way (`REDIS_URL=redis://...`) —
Upstash isn't a hard dependency, just the natural choice if you're already
using Vercel for the client.

Behavior:

- Unset → in-memory token buckets (original behavior, zero change).
- Set → a Redis-backed fixed-window counter (`INCR` + `PEXPIRE` per key),
  namespaced separately for text messages, attachments, and join attempts.
- Any Redis error (timeout, connection drop) **fails open** — the action is
  allowed and a warning is logged, rather than a Redis outage taking chat
  down entirely.

Verified against a real local Redis container: correct allow/block
counts under a burst, per-key isolation, window expiry, and cleanup of a
socket's counters on disconnect (confirmed via `redis-cli KEYS`/`PTTL`),
plus the fail-open path with a broken client.

## 4. Wiring it together

```
apps/client  --VITE_SERVER_URL-->  apps/server  --CLIENT_ORIGIN check-->  apps/client
```

- Client → server: `VITE_SERVER_URL` (client env var, build-time) must
  point at the server's public URL.
- Server → client: `CLIENT_ORIGIN` (server env var, runtime) must exactly
  match the client's deployed origin, or Socket.IO's CORS check rejects
  the connection.

Update both whenever either URL changes (e.g. moving off a preview domain
to a custom domain).
