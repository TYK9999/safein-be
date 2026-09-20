## Why

SafeIn5 backend is runnable locally but has no automated path from git to AWS. We need a repeatable CI/CD pipeline so a merge to `dev` deploys the NestJS API to the **dev** EC2 instance over SSH—without a container registry. Other environments (qa, stage, demo) are deferred.

## What Changes

- Add a GitHub Actions CI workflow that builds, lints, and tests on pull requests targeting **`dev`**
- Add a CD path that, on merge (push) to **`dev`**, SSHs to the **dev** EC2 host and updates the running API to that git commit (sync + rebuild/restart on the host)
- Scope this change to the **dev** branch and GitHub Environment only
- Add production-oriented Docker Compose (or equivalent) for running the API on EC2 from a local build on that host—**no Amazon ECR / image registry**
- Document required GitHub Environment secrets (SSH) and EC2 host prerequisites for **dev**
- Out of scope: qa/stage/demo pipelines, ECR/GHCR/Docker Hub, SSM deploy, provisioning EC2/RDS from scratch (IaC), blue/green traffic shifting

## Capabilities

### New Capabilities
- `ci-pipeline`: Automated quality gates (install, lint, test, build) on PRs to `dev`
- `ec2-deploy`: Merge-triggered deployment of the backend to the **dev** EC2 instance over SSH (host build/restart)

### Modified Capabilities

## Impact

- New `.github/workflows/*` (and optionally `Dockerfile` / `docker-compose.prod.yml` for on-host builds)
- Dev EC2: SSH deploy user, app directory, Docker (or Node process manager), host `.env`
- GitHub: Environment `dev` with `EC2_HOST`, `EC2_USER`, `SSH_PRIVATE_KEY`, `HEALTHCHECK_URL`, optional `APP_DIR` / `SSH_PORT`
- No AWS IAM OIDC / ECR repository required for this change
- Runtime on EC2 must expose health (`/api/v1/health`) for post-deploy verification
