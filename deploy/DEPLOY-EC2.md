# Deploying the SafeIn5 backend to EC2 (Docker + RDS + ALB)

This deploys the backend as a **Docker container on a single EC2 instance**, with
**Postgres on Amazon RDS** and **HTTPS terminated by an Application Load Balancer**
(the app itself serves plain HTTP on the box). Object storage is **real AWS S3** and
speech-to-text is **AWS Transcribe**, both accessed via the instance's **IAM role**
(no static AWS keys).

```
Browser ──HTTPS──▶ ALB (ACM cert) ──HTTP:3000──▶ EC2 (Docker: safein5-backend)
                                                     │  IAM role
                                                     ├─▶ RDS Postgres (TLS)
                                                     ├─▶ S3 (media, presigned URLs)
                                                     └─▶ Transcribe
```

Files in this repo used below: [`Dockerfile`](../Dockerfile),
[`docker-compose.prod.yml`](../docker-compose.prod.yml),
[`.env.production.example`](../.env.production.example),
[`iam-policy.json`](./iam-policy.json), [`s3-cors.json`](./s3-cors.json),
[`deploy.sh`](./deploy.sh), [`ci.yml`](../.github/workflows/ci.yml).

---

## 0. Prerequisites

- An AWS account + a domain you can point at the ALB (e.g. `api.example.com`).
- The AWS CLI configured locally (for the bucket/CORS/policy commands), or use the console.
- The instance will build the image itself, so **native modules (`sharp`, `ffmpeg-static`)
  compile for the instance's CPU arch** automatically — no cross-compilation needed.

---

## 1. RDS Postgres

1. Create an **RDS for PostgreSQL 16** instance (Single-AZ is fine to start; enable
   automated backups). Note the endpoint, master user, password, and DB name.
2. Give it a **security group** that (in step 4) will allow inbound `5432` from the
   EC2 instance's security group only.
3. Keep the default **`rds.force_ssl=1`** — the app connects with TLS (`DATABASE_SSL=true`).

`DATABASE_URL` will look like:
`postgres://safein:PASSWORD@your-db.xxxx.us-east-1.rds.amazonaws.com:5432/safein`

## 2. S3 media bucket

1. Create a bucket, e.g. `safein5-prod-media`, with **Block all public access = ON**
   (presigned URLs work on a private bucket).
2. Apply CORS so the PWA can upload/play directly in the browser (edit the origin in
   [`s3-cors.json`](./s3-cors.json) first):
   ```bash
   aws s3api put-bucket-cors --bucket safein5-prod-media \
     --cors-configuration file://deploy/s3-cors.json
   ```
3. Add a **lifecycle rule** to reclaim abandoned multipart uploads (the app relies on
   this instead of a server-side reaper):
   ```bash
   aws s3api put-bucket-lifecycle-configuration --bucket safein5-prod-media \
     --lifecycle-configuration '{"Rules":[{"ID":"abort-incomplete-mpu","Status":"Enabled","Filter":{},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}]}'
   ```

## 3. IAM instance role

Create a role for EC2 with least-privilege access to the bucket + Transcribe
(edit the bucket name in [`iam-policy.json`](./iam-policy.json) first):

```bash
aws iam create-policy --policy-name safein5-backend --policy-document file://deploy/iam-policy.json
aws iam create-role --role-name safein5-backend \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name safein5-backend --policy-arn <policy-arn-from-above>
aws iam create-instance-profile --instance-profile-name safein5-backend
aws iam add-role-to-instance-profile --instance-profile-name safein5-backend --role-name safein5-backend
```

Because the role is attached, **leave `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
blank** in the env — the SDK uses the role automatically.

## 4. EC2 instance

1. Launch an instance — **Ubuntu 24.04** or **Amazon Linux 2023**. Attach the
   **`safein5-backend` instance profile** from step 3.
   - **Size for transcoding**: playback transcode is CPU-heavy. Start at **t3.medium
     (2 vCPU)**; go to a `c`-family or larger if you expect many concurrent uploads.
     Tune `PLAYBACK_FFMPEG_THREADS` accordingly.
   - Give it ~20 GB+ disk (temp files during transcode live in `/tmp`).
2. **Security groups**:
   - EC2 SG: inbound `3000` **from the ALB's security group only**, and `22` (SSH) from
     your admin IP.
   - RDS SG: inbound `5432` **from the EC2 SG**.

## 5. Install Docker on the instance

```bash
# Ubuntu
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git postgresql-client
sudo usermod -aG docker $USER && newgrp docker
# (Amazon Linux 2023: sudo dnf install -y docker git postgresql15; sudo systemctl enable --now docker)
```

## 6. Get the code + configuration

```bash
git clone <your-repo-url> safein5-be && cd safein5-be
cp .env.production.example .env
```

Edit `.env` and fill every `<CHANGE ME>`:

- **JWT keypair** (required in prod). Generate and paste each PEM as a single line
  with `\n` between lines:
  ```bash
  openssl genpkey -algorithm ed25519 -out jwt_priv.pem
  openssl pkey -in jwt_priv.pem -pubout -out jwt_pub.pem
  awk 'NF {printf "%s\\n", $0}' jwt_priv.pem   # -> JWT_PRIVATE_KEY
  awk 'NF {printf "%s\\n", $0}' jwt_pub.pem    # -> JWT_PUBLIC_KEY
  ```
- **Secrets**: `OTP_HASH_SECRET`, `UPLOAD_URL_SECRET` → `openssl rand -base64 32`.
- **`DATABASE_URL`** (RDS), **`APP_URL`** / **`CORS_ORIGINS`** (your domains),
  **`S3_BUCKET_NAME`** + **`AWS_REGION`**.

`.env` is gitignored — keep it only on the box (or in a secrets manager).

## 7. Apply the database schema to RDS (one-time)

There is **no migration runner** — the schema is one SQL file:

```bash
source .env   # or export DATABASE_URL / PGSSLMODE
PGSSLMODE=require psql "$DATABASE_URL" -f db/schema/schema.sql
```

> ⚠️ On a **schema change**, re-applying `schema.sql` as-is fails on existing tables
> (it's `CREATE TABLE`, not `IF NOT EXISTS`). In dev the flow is drop+recreate — do
> **not** do that against production data. For prod, hand-write the incremental
> `ALTER`/`CREATE` for the change and run it against RDS during a maintenance window.

## 8. Build + run

```bash
docker compose -f docker-compose.prod.yml up -d --build
curl -fsS http://127.0.0.1:3000/healthz && echo OK
docker compose -f docker-compose.prod.yml logs -f   # watch startup
```

The app is now serving on the instance at `:3000` (plain HTTP).

## 9. Application Load Balancer (HTTPS)

1. Request/import an **ACM certificate** for `api.example.com` in the ALB's region.
2. **Target group**: type *Instances*, protocol **HTTP**, port **3000**, health-check
   path **`/healthz`** (success code 200). Register the EC2 instance.
3. **ALB**: internet-facing; **HTTPS:443** listener (ACM cert) → forward to the target
   group; add an **HTTP:80** listener that redirects to 443.
4. Point **`api.example.com`** (Route 53 alias / your DNS) at the ALB.

Verify: `curl https://api.example.com/healthz`.

## 10. Point the front-end at the API

In the UI's production env (`safein5-ui/.env.production`):

```
VITE_API_BASE_URL=https://api.example.com/api/v1
```

(and make sure `https://app.example.com` is in the backend's `CORS_ORIGINS` **and** the
bucket CORS from step 2). Rebuild/redeploy the PWA.

---

## Updating (CI/CD)

Pushing to **`dev`** auto-deploys via [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):
the GitHub runner SSHes into the box (secret `SAFE_IN_PEM`) and runs
[`deploy.sh`](./deploy.sh), which hard-syncs the repo to `origin/dev` using the box's
**GitHub deploy key**, then rebuilds + health-checks the container. Nothing is built on
the runner — the box builds its own image. The untracked `.env` is preserved
(`reset --hard`, never `git clean`).

**One-time deploy-key setup on the box** (so `deploy.sh` can pull over SSH):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""     # generate the key pair
cat ~/.ssh/id_ed25519.pub                             # add this key to the repo:
#   GitHub -> repo -> Settings -> Deploy keys -> Add deploy key (read-only is enough)
ssh -T git@github.com                                 # verify: "Hi <owner>/<repo>! ...authenticated"
```

**Required repo secrets** (Settings -> Secrets and variables -> Actions):
`SAFE_IN_PEM` (full .pem to SSH into EC2), `SAFE_IN_EC2_HOST` (public DNS or Elastic
IP), `SAFE_IN_USER` (`ubuntu`). The EC2 security group must allow inbound SSH (22)
from the runner.

**Manual deploy** (same script, run on the box):

```bash
bash ~/safein5-be/deploy/deploy.sh    # deploy-key sync -> rebuild -> restart -> health check
```

## Operations

- **Logs**: `docker compose -f docker-compose.prod.yml logs -f` (also capped json-file
  logs on disk). Request logs are one line each (method, path, status, ms).
- **Backups**: RDS automated backups/snapshots. (S3 versioning optional.)
- **Restart on reboot**: `restart: unless-stopped` brings the container back; Docker
  starts on boot (`systemctl enable docker`).
- **Client IP / redirects behind the ALB**: the app trusts the `X-Forwarded-Proto`
  the ALB sets for HTTPS cookies. If you later need accurate client IPs in logs,
  enable Fastify `trustProxy`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| App exits on boot: *"JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production"* | JWT keys not set / mis-escaped in `.env`. |
| App can't reach the DB | RDS SG doesn't allow the EC2 SG on 5432, or `DATABASE_SSL` not `true`. |
| Browser upload blocked (CORS) | Bucket CORS origin ≠ your front-end origin (step 2). |
| `AccessDenied` on S3/Transcribe | Instance profile not attached, or bucket name in `iam-policy.json` wrong. |
| ALB target *unhealthy* | Health-check path must be `/healthz` (not `/api/...`); EC2 SG must allow the ALB SG on 3000. |
| Transcode never finishes / API laggy | Instance too small — raise vCPUs and/or `PLAYBACK_FFMPEG_THREADS`. |
