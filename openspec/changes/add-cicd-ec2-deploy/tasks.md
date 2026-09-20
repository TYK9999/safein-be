## 1. Container packaging (on-host build)

- [x] 1.1 Add multi-stage `Dockerfile` for Nest production image built **on the EC2 host** (not pushed to a registry)
- [x] 1.2 Add `docker-compose.prod.yml` that builds/runs the API from the local context, loads host `.env`, and works with Postgres on the instance
- [x] 1.3 Add `.dockerignore` excluding `node_modules`, `dist`, `.env`, docs noise

## 2. CI workflow

- [x] 2.1 Narrow `.github/workflows/ci.yml` to PRs targeting **`dev` only** (remove `qa`/`stage`/`demo`)
- [x] 2.2 Ensure CI workflow has no deploy / SSH / registry steps

## 3. CD workflow

- [x] 3.1 Narrow `.github/workflows/deploy.yml` push trigger to **`dev` only**
- [x] 3.2 Use GitHub Environment **`dev`** only; run lint/test/build before deploy
- [x] 3.3 SSH to `EC2_HOST` as `EC2_USER` with `SSH_PRIVATE_KEY`; sync the commit SHA to `APP_DIR` (rsync/scp preferred)
- [x] 3.4 On the host: rebuild and restart via `docker compose -f docker-compose.prod.yml up -d --build`
- [x] 3.5 Post-deploy: curl `HEALTHCHECK_URL` (or curl over SSH if private) and fail the job on non-success

## 4. Docs and ops checklist

- [x] 4.1 Document EC2 prerequisites for **dev**
- [x] 4.2 Document GitHub Environment **`dev`** secrets/vars only (`EC2_HOST`, `EC2_USER`, `SSH_PRIVATE_KEY`, `HEALTHCHECK_URL`, optional `APP_DIR`, `SSH_PORT`)
- [x] 4.3 Document rollback for dev
- [x] 4.4 Update README CI/CD overview to state **dev-only** scope (qa/stage/demo deferred)

## 5. Verification

- [ ] 5.1 Open a dry-run PR against `dev` and confirm CI runs (lint/test/build) without deploying
- [ ] 5.2 After dev secrets are configured: merge/push to `dev` and confirm **dev** EC2 health succeeds
- [x] 5.3 Confirm workflow files contain no hardcoded SSH private keys or other live credentials, and no ECR/OIDC deploy steps
