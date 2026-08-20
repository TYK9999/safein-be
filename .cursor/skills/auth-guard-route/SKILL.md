---
name: auth-guard-route
description: Choose and wire SafeIn5 route auth (global JWT, @Public, or OptionalJwtGuard) using modules/auth decorators and claims. Use when adding or changing endpoint authentication or guest-capable routes.
---

# Auth guard route

## Decision

1. **Must be logged in?** → default global `JwtAuthGuard`; use `@CurrentUser()`.
2. **Fully public (OTP, health-style feature routes)?** → `@Public()`.
3. **Works for guest and logged-in?** → `@Public()` + `@UseGuards(OptionalJwtGuard)` + `@OptionalUser()`.

## Imports

Always from `src/modules/auth/`:

```typescript
import { CurrentUser, OptionalUser, Public } from '../auth/decorators';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import type { VerifiedAccess } from '../auth/authed-request';
```

## Rules

- Never invent `identity/` imports
- Do not authorize solely from JWT `role` — guard refreshes membership/role from DB
- Claims: `sub` (user id), `tid` (tenant), `role`, `email`
- Scope all tenant data by `tid` / `tenant_id` in the service

## Checklist

- [ ] Correct Public / Optional / default mode
- [ ] Imports from `modules/auth`
- [ ] Service receives user/tenant explicitly
- [ ] Guest paths still enforce tenant rules where the spec requires a QR/token context
