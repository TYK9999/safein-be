## Context

See proposal.md - Why. Backend foundation exists with NestJS + Express + Postgres health. Repo is on GitHub. **This change scopes CI/CD to `dev` only** (branch + GitHub Environment + EC2). Deploy path: merge to `dev`, then **SSH to dev EC2**, sync that commit, rebuild/restart on the host. **No ECR / container registry.** qa / stage / demo are deferred.

## Goals / Non-Goals

**Goals:**
- GitHub Actions CI (lint/test/build) on PRs to `dev`
- CD on push to `dev` to dev EC2 over SSH
- Host runs the exact git SHA that triggered deploy
- Post-deploy health check
- Document dev EC2 prerequisites (app directory, Docker or Node runtime, SSH deploy user, `.env`)

**Non-Goals:**
- Pipelines or GitHub Environments for qa, stage, or demo (later change)
- Amazon ECR, GHCR, Docker Hub, or any image registry
- AWS OIDC / IAM roles for deploy (not needed without ECR)
- SSM deploy path
- Terraform to create VPC/EC2/RDS
- Automatic DB migrations as a hard gate
- Frontend deploy

## Decisions

### 1. GitHub Actions
- **Choice:** `.github/workflows/ci.yml` + `.github/workflows/deploy.yml`
- **Why:** Repo already on GitHub

### 2. Branch to environment mapping (MVP)
| Branch | GitHub Environment | EC2 target |
|--------|--------------------|------------|
| `dev` | `dev` | Dev instance |

### 3. No registry - build on the EC2 host
- **Choice:** After CI passes, SSH to the host and sync the commit SHA into `APP_DIR`, then `docker compose -f docker-compose.prod.yml up -d --build`
- **Why:** User rejected ECR; keeps deploy simple
- **Trade-off:** Build CPU/time on the dev EC2

### 4. Host update via SSH
- **Choice:** native `ssh` + `rsync` with dev Environment deploy key
- **Why:** Team preference

### 5. Auth: SSH only for deploy
- **Choice:** `SSH_PRIVATE_KEY`, `EC2_HOST`, `EC2_USER` in GitHub Environment `dev`

### 5b. Preferred transfer: rsync/scp from Actions
- **Choice:** Actions checks out the SHA, then `rsync` over SSH to `APP_DIR`, then build/restart on the host

### 6. Dev GitHub Environment secrets
`EC2_HOST`, `EC2_USER`, `SSH_PRIVATE_KEY`, `HEALTHCHECK_URL`, optional `APP_DIR`, `SSH_PORT`.

App `.env` remains on the host - not rewritten each deploy.

### 7. Workflow shape

```
  PR -> dev                    Push -> dev
         |                            |
         v                            v
      [ci] lint/test/build      [ci] lint/test/build
                                         | pass
                                         v
                                   SSH: sync SHA + build/restart
                                         |
                                         v
                                   GET HEALTHCHECK_URL
```

### 8. Docker on host
Keep a `Dockerfile` + `docker-compose.prod.yml` so the host builds locally from the synced tree.

## Risks / Trade-offs

- [Slower deploys / load on small EC2] -> Multi-stage Dockerfile; cache npm layers
- [SSH exposure] -> Restrict SG; rotate keys; Environment-scoped secrets
- [Private health URL] -> curl via same SSH session after restart

## Migration Plan

1. Prepare dev EC2: Docker, deploy SSH user, `APP_DIR`, host `.env`, security group for SSH
2. Create GitHub Environment `dev` + secrets
3. Land workflows + compose files; push to `dev`
4. Confirm health; rollback by re-running workflow on previous commit or SSH sync of previous SHA

## Open Questions

- Whether the host uses Docker Compose or bare Node/pm2 (defaults to Compose)
- Public SSH vs bastion / self-hosted runner (docs only)
- When to add qa/stage/demo (separate change)
