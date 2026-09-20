# CI/CD - EC2 deploy (SSH, no ECR)

**Scope (current):** `dev` branch -> GitHub Environment `dev` -> dev EC2 only.
qa / stage / demo pipelines are deferred.

GitHub Actions deploys SafeIn5 backend to EC2 over SSH. Images are **built on the host**; there is no container registry.

## Branch -> environment

| Git branch | GitHub Environment | Target |
|------------|--------------------|--------|
| `dev` | `dev` | Dev EC2 |

- **CI** (`.github/workflows/ci.yml`): pull requests to `dev` -> lint, test, build. Does **not** deploy.
- **CD** (`.github/workflows/deploy.yml`): push to `dev` -> quality gates -> rsync over SSH -> `docker compose -f docker-compose.prod.yml up -d --build` -> health check.

## EC2 prerequisites (dev)

1. Docker Engine + Docker Compose plugin
2. Linux user for deploys (example: `deploy`) with that user in the `docker` group (or equivalent permission to run compose)
3. SSH: public key in `~/.ssh/authorized_keys`; password auth disabled recommended
4. Security group / firewall: allow SSH (22 or custom) from GitHub Actions egress (or a bastion / self-hosted runner path you control)
5. Application directory (default `/opt/safein5-be`), writable by the deploy user
6. Host `.env` in `APP_DIR` (copy from `.env.example`; set real `DATABASE_URL`, `PORT`, etc.). **Never** commit this file - rsync excludes `.env`
7. Postgres reachable from the API container via `DATABASE_URL` (Postgres on the EC2 host, sibling container, or RDS). Local developer machines use a host-installed Postgres — not Docker Compose.

One-time bootstrap example:

```bash
sudo mkdir -p /opt/safein5-be
sudo chown deploy:deploy /opt/safein5-be
# place .env on the host
cp .env.example /opt/safein5-be/.env   # then edit secrets
```

## GitHub Environment secrets / variables

Create a GitHub Environment named exactly: **`dev`**.

**Secrets (required):**

| Name | Purpose |
|------|---------|
| `EC2_HOST` | Hostname or IP for SSH |
| `EC2_USER` | SSH user |
| `SSH_PRIVATE_KEY` | Private key matching `authorized_keys` (full PEM, including headers) |
| `HEALTHCHECK_URL` | Public health URL, e.g. `http://<host>:3000/api/v1/health` |

If `HEALTHCHECK_URL` is empty, the workflow curls `http://127.0.0.1:3000/api/v1/health` **on the host over SSH**.

**Variables (optional):**

| Name | Default | Purpose |
|------|---------|---------|
| `APP_DIR` | `/opt/safein5-be` | Remote app path |
| `SSH_PORT` | `22` | SSH port |

## Rollback

1. **Preferred:** Re-run **Deploy** on a previous commit (`workflow_dispatch` from the `dev` branch at that SHA, or revert + push to `dev`).
2. **Manual:** SSH to the host, restore the previous tree (or re-rsync an old SHA from a workstation), then:

```bash
cd /opt/safein5-be
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
```

`DEPLOY_SHA` in the app directory records the last deployed commit from Actions.

## Security notes

- Do not put live private keys or passwords in the repository.
- Scope secrets to the `dev` GitHub Environment.
- Prefer restricting SSH to known CI IPs or a bastion.
