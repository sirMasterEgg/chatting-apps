# Build context is the repo root (see docker-compose.yml / DEPLOYMENT.md) -
# an npm workspaces monorepo needs the whole workspace graph to install and
# to resolve @shared/root correctly.

FROM node:20-alpine AS builder
WORKDIR /repo

# Copy just the manifests first so `npm ci` is cached independently of
# source changes.
COPY package.json package-lock.json turbo.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
RUN npx turbo run build --filter=@app/server

# ---- production image: only the server's own runtime deps ----
FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json turbo.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspace=@app/server --workspace=@shared/root

COPY --from=builder /repo/apps/server/dist ./apps/server/dist

EXPOSE 4000
CMD ["node", "apps/server/dist/apps/server/src/index.js"]
