# Deployment

This app splits across two very different runtime shapes, so it deploys as
two separate services:

| Service | What it is | Where it goes |
|---|---|---|
| `apps/client` | Static Vite build (React SPA) | **Vercel**, via Turborepo |
| `apps/server` | Stateful Express + Socket.IO process | Any host that runs a persistent Node process (Docker image provided) |

## Why the server can't run as Vercel Functions

This was tried and rejected — not on general principle, but because of one
specific mechanism, even after moving all room/user/typing state to Redis
(see [§3](#3-redis-for-sharedhorizontally-scaled-state)):

Socket.IO keeps each connection's session — `socket.data.roomId`,
`socket.data.username`, set on `room:join` and checked on every
`message:send` — as an in-memory property on that one connection's `Socket`
object, inside whichever process accepted it. Vercel Functions are
stateless invocations with no guaranteed routing back to the same instance;
there's no sticky-session mechanism for them. So a client could join
successfully, then get `NOT_JOINED` on its very next message the moment
Vercel happens to route it to a different function instance — regardless of
what's in Redis, because Redis was never the thing holding that data.
Fixing this for real would mean replacing Socket.IO's own connection/session
model with one that rehydrates from Redis on every single request — in
effect, writing a custom serverless transport for Socket.IO — which is out
of scope here. Vercel also has no product for a plain persistent container
in the first place; their platform is Functions, Edge, and static hosting.

Any host that runs a normal, long-lived Node process — Railway, Render,
Fly.io, a plain VPS, your own Docker host — sidesteps this entirely, since
the process (and therefore every open socket's session) just keeps running.
A `Dockerfile` is provided for that path, built and verified end-to-end
(§2) below.

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
  apps/server/dist/apps/server/src/index.js` run from the repo root. All
  three run your app as a real persistent process (with sticky WebSocket
  connections), so the Redis-backed state in §3 is optional there unless
  you're running multiple replicas.
- **Plain VPS**: same two commands, behind a reverse proxy (nginx/Caddy)
  that forwards to `PORT` and passes through WebSocket upgrades.

### Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no (defaults to 4000) | Some platforms (Railway, Render) inject this themselves |
| `CLIENT_ORIGIN` | **yes** | Must exactly match your deployed client's origin — CORS rejects everything else |
| `REDIS_URL` | no | See below |

## 3. Redis for shared/horizontally-scaled state

`REDIS_URL` unset (the default) → everything is in-memory, exactly as
originally built: rooms, users, typing state, and rate-limit counters all
live in the one running process, and restarting it drops all of them with
nothing on disk — the full no-persistence guarantee from
[docs/issue-2.md](./docs/issue-2.md), unchanged.

`REDIS_URL` set → room membership, typing state
(`apps/server/src/store/roomStore.ts`), and rate-limit counters
(`apps/server/src/socket/rateLimit.ts`) all move to Redis, so multiple
server **replicas behind a load balancer** (e.g. Railway/Fly/Render scaled
to 2+ instances) see a consistent view instead of each instance having its
own isolated rooms. This is genuinely useful once you're horizontally
scaling the persistent-host deployment from §2 — it does **not** enable
running on Vercel Functions (see the explanation above); the blocker there
is Socket.IO's own per-connection session object, which nothing in this
section touches.

**Chat content is still never persisted.** Redis here holds only the same
kind of ephemeral, session-scoped data that used to live in a `Map`/`Set` —
socket-id → user, who's typing, and rate-limit counts — carrying a
safety-net TTL (6h for room data, matching each limiter's own window for
rate limits) so nothing lives forever even if cleanup somehow doesn't fire.
Messages are still broadcast and immediately forgotten; they never touch
Redis.

Failure behavior differs by what's being protected:
- **Rate limiting** fails open — a Redis error allows the action through
  (logged as a warning) rather than let a Redis outage block chat.
- **Room state** surfaces the error to the caller instead of silently
  falling back to a local `Map` — a fallback would only live in this one
  process and wouldn't be visible to whichever instance handles that
  client's next request, which is worse than a clear `SERVER_ERROR` ack.

To provision Redis via **Vercel's Marketplace Redis** (Upstash):

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

Verified against a real local Redis container (not just a mock): a full
two-client join/message/leave session with Redis backing room state and
typing indicators (data structures confirmed directly via `redis-cli
HGETALL`/`SMEMBERS` mid-session), correct rate-limit allow/block counts
under a burst with per-key isolation and window expiry, cleanup of a
socket's keys on disconnect (`redis-cli KEYS`/`PTTL`), and the fail-open
path with a deliberately broken client.

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
