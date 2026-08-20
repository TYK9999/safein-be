# syntax=docker/dockerfile:1
#
# Production image for the SafeIn5 backend (NestJS on Fastify).
# Multi-stage: compile with all deps, then ship only production deps + dist.
#
# NOTE ON NATIVE MODULES: `sharp` and `ffmpeg-static` install CPU-arch-specific
# binaries. They are fetched for the BUILD platform, so build on the same arch as
# the EC2 instance (amd64, or arm64 on Graviton). The simplest guarantee is to run
# `docker compose -f docker-compose.prod.yml build` ON the instance.

# ---- builder: install everything and compile TS -> dist ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: production deps + compiled output only ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only (re-fetches sharp/ffmpeg-static binaries for this
# platform). Kept as its own layer so it caches across code-only changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
# Ship the schema so it can be applied to RDS from the box (see deploy/DEPLOY-EC2.md).
COPY db ./db

# Drop root.
USER node

# The app reads PORT from env and binds 0.0.0.0. Documented for the ALB target group.
EXPOSE 3000

# Container-level liveness (the ALB runs its own health check against /healthz too).
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]
