# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg \
  && addgroup -S safein5 && adduser -S safein5 -G safein5
COPY --from=build --chown=safein5:safein5 /app/package.json /app/package-lock.json ./
COPY --from=build --chown=safein5:safein5 /app/node_modules ./node_modules
COPY --from=build --chown=safein5:safein5 /app/dist ./dist
USER safein5
EXPOSE 3000
CMD ["node", "dist/main.js"]
