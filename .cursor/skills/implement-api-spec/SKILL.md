---
name: implement-api-spec
description: Implement or adjust SafeIn5 backend endpoints from api/BACKEND_*_SPEC.md or docs/md upload specs, including {code,message} errors and presigned S3 flows. Use when working from an API contract or media upload/STT spec.
---

# Implement API spec

## Steps

1. Read the relevant spec:
   - `api/BACKEND_AUDIO_UPLOAD_SPEC.md`
   - `api/BACKEND_SPEECH_TO_TEXT_SPEC.md`
   - `docs/md/BACKEND_UPLOAD_SPEC.md`
2. Map routes into the owning module under `src/modules/` (audio, stt, uploads, …).
3. Add Zod schemas for JSON bodies/query DTOs.
4. Choose auth: public / JWT / optional guest (see `auth-guard-route`).
5. For media errors, use `fail(status, code, message)` with **exact** spec codes.
6. Browser uploads: presign → client PUT → confirm/list. Do not proxy bytes through the API.
7. Add schema/workflow unit tests; keep controllers thin.
8. Note any intentional spec deviations in the PR description.

## References

- `src/modules/audio/` — clip upload + `fail()`
- `src/modules/stt/` — Transcribe jobs
- `src/modules/uploads/` — video multipart + sweepers

## Checklist

- [ ] Routes match spec paths/verbs under `/api/v1`
- [ ] Error codes match spec
- [ ] Presigned S3 (no media proxy)
- [ ] Tests for schemas / critical branches
