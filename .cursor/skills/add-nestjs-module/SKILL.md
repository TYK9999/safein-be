---
name: add-nestjs-module
description: Scaffold a new SafeIn5 NestJS feature under src/modules with module, controller, service, Zod schema, tests, and AppModule wiring. Use when adding a new backend feature module or endpoint group.
---

# Add NestJS module

## Steps

1. Create `src/modules/<feature>/` with:
   - `<feature>.module.ts`
   - `<feature>.controller.ts` — `@Controller({ version: '1' })`
   - `<feature>.service.ts` — `@Inject(APP_DB) private readonly db: Kysely<DB>`
   - `<feature>.schema.ts` — Zod + `createZodDto`
   - `tests/<feature>.spec.ts` (schema / pure helpers first)
2. Choose auth mode (see `auth-guard-route` skill).
3. Import the module in `src/app.module.ts`.
4. If DB tables change, run `kysely-schema-sync`.
5. If new env vars are needed, run `extend-env-config`.

## Templates

Controller (authenticated):

```typescript
@Controller({ path: '<feature>', version: '1' })
export class FeatureController {
  constructor(private readonly feature: FeatureService) {}

  @Post()
  create(@CurrentUser() user: VerifiedAccess, @Body() dto: CreateFeatureDto) {
    return this.feature.create(user, dto);
  }
}
```

Do **not** place code in legacy `src/qrcode/` or `src/uploads/`.

## References

- `src/modules/signals/` — domain + workflow
- `src/modules/audio/` — media + `fail()` errors
---

## Checklist

- [ ] Files under `src/modules/<feature>/`
- [ ] Wired in `AppModule`
- [ ] Zod DTOs + global pipe only
- [ ] Tenant filter on queries
- [ ] Unit tests for schema / pure logic
