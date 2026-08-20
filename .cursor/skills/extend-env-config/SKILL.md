---
name: extend-env-config
description: Add or change environment variables across env.schema.ts, configuration.ts, and .env.example with no silent defaults. Use when introducing config, toggling features, or fixing boot-time env validation.
---

# Extend env config

## Steps

1. Add/update the Zod field in `src/config/env.schema.ts` (required unless truly optional).
2. Map it in `src/config/configuration.ts` into the nested config object.
3. Document the key in `.env.example` (and `.env.production.example` if prod needs it).
4. Consume with `config.getOrThrow('...')` in services (or optional get only when mode-specific).
5. Run `npm run typecheck` and boot `npm run start:dev` once to confirm validation.

## Rules

- No hardcoded defaults for required keys in schema or services
- Keep comments explaining CORS vs APP_URL vs PUBLIC_BASE_URL accurate
- Never commit `.env`

## Checklist

- [ ] `env.schema.ts`
- [ ] `configuration.ts`
- [ ] `.env.example`
- [ ] Service uses `getOrThrow` / documented optional path
