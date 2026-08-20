#!/usr/bin/env bash
# Deploy / update the SafeIn5 backend ON the EC2 instance.
#
# Used two ways, identically:
#   - CI pipes it over SSH:   ssh ... 'bash -s' < deploy/deploy.sh   (.github/workflows/ci.yml)
#   - Manually on the box:    bash ~/safein5-be/deploy/deploy.sh
#
# It hard-syncs the repo to origin/dev using the box's GitHub DEPLOY KEY (SSH),
# then rebuilds and health-checks the container. The untracked, gitignored .env is
# preserved by `git reset --hard` — we NEVER `git clean`.
set -euo pipefail

APP_DIR="$HOME/safein5-be"
REPO_SSH="git@github.com:smaro-talentica/safein5-be.git"
BRANCH="dev"
COMPOSE="docker compose -f docker-compose.prod.yml"

# --- 1. Trust github.com's host key (non-interactive first run) ---------------
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
if ! ssh-keygen -F github.com >/dev/null 2>&1; then
  ssh-keyscan -t rsa,ed25519 github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null
fi

# --- 2. Sync the repo to origin/dev over SSH (uses the deploy key) ------------
if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> First run: cloning $REPO_SSH ($BRANCH)"
  git clone -b "$BRANCH" "$REPO_SSH" "$APP_DIR"
fi
cd "$APP_DIR"
git remote set-url origin "$REPO_SSH"   # ensure SSH remote so the deploy key is used
echo "==> Fetching origin/$BRANCH via deploy key"
if ! git fetch --prune origin "$BRANCH"; then
  echo "ERROR: git fetch failed. Confirm the deploy key is added to the repo and" >&2
  echo "       present at ~/.ssh/id_ed25519 on this box. Test:  ssh -T git@github.com" >&2
  exit 1
fi
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"       # discard tracked changes; keeps untracked .env

# --- 3. Require the runtime env file -----------------------------------------
if [ ! -f .env ]; then
  echo "ERROR: .env not found in $APP_DIR. Create it from .env.production.example." >&2
  exit 1
fi

# --- 4. Build + (re)start (native deps build for this instance's arch) --------
echo "==> Building + (re)starting the container"
$COMPOSE up -d --build
docker image prune -f >/dev/null 2>&1 || true

# --- 5. Health gate ----------------------------------------------------------
PORT=$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '[:space:]' || true)
PORT=${PORT:-3000}
echo "==> Waiting for health on :${PORT}/healthz"
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1; then
    echo "==> Healthy at :${PORT}/healthz"
    exit 0
  fi
  sleep 2
done

echo "ERROR: not healthy after ~40s. Check logs:  $COMPOSE logs -f" >&2
exit 1
