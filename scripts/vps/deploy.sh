#!/usr/bin/env bash
# Auto-deploy for BambooStudio on the VPS.
#
# Installed as /usr/local/bin/bamboo-deploy by install-autodeploy.sh and run
# every minute by a systemd timer. When the tracked branch on GitHub has a new
# commit it: installs locked dependencies, typechecks, builds the site into a
# staging folder, applies DB schema changes, rebuilds the API, restarts it and
# swaps the site in. If anything fails, the previous commit is rebuilt and
# restored, so a broken push never leaves the live site down.
#
# Manual run:  bamboo-deploy            (deploy only if there is a new commit)
#              bamboo-deploy --force    (rebuild the current target anyway)
# Log:         /var/log/bamboo-deploy.log
set -Eeuo pipefail

APP_DIR=${APP_DIR:-/var/www/bamboo}
BRANCH=${DEPLOY_BRANCH:-ver4.0}
SECRETS_DIR=${SECRETS_DIR:-/root/bamboo-secrets}
LOG=${DEPLOY_LOG:-/var/log/bamboo-deploy.log}
PM2_NAME=${PM2_NAME:-bamboo}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:8080/api/healthz}
SITE_DIR="$APP_DIR/artifacts/bamboo-studio/dist/public"
STAGE_DIR="$APP_DIR/.deploy-stage"

export CI=true PORT=8080 BASE_PATH=/ NODE_ENV=production

# One deploy at a time; a run that finds the lock held just exits.
exec 9>/run/bamboo-deploy.lock
flock -n 9 || exit 0

cd "$APP_DIR"
git fetch -q origin "$BRANCH"
current=$(git rev-parse HEAD)
target=$(git rev-parse "origin/$BRANCH")
if [ "${1:-}" != "--force" ]; then
  [ "$current" = "$target" ] && exit 0
  # A commit that already failed is not retried every minute; push a fix
  # (new commit) or run with --force.
  [ "$(git rev-parse -q --verify refs/deploy/failed || true)" = "$target" ] && exit 0
fi

exec >>"$LOG" 2>&1
log() { echo "[$(date '+%F %T')] $*"; }

# deploy_commit <sha> <checks: 1|0>
deploy_commit() {
  local sha=$1 checks=$2 schema_log
  git checkout -q -f -B "$BRANCH" "$sha"
  pnpm install --frozen-lockfile

  if [ "$checks" = 1 ]; then
    log "Typecheck"
    pnpm run typecheck:libs
    pnpm --filter @workspace/api-server run typecheck
    pnpm --filter @workspace/bamboo-studio run typecheck
  fi

  log "Build site (staging)"
  rm -rf "$STAGE_DIR"
  pnpm --filter @workspace/bamboo-studio run build --outDir "$STAGE_DIR" --emptyOutDir
  [ -f "$STAGE_DIR/index.html" ] || { log "Site build produced no index.html"; return 1; }

  if [ "$checks" = 1 ]; then
    log "Database schema"
    schema_log=$(mktemp)
    (
      set -a; . "$SECRETS_DIR/db.env"; set +a
      timeout 180 pnpm --filter @workspace/db run push </dev/null
    ) 2>&1 | tee "$schema_log"
    # drizzle-kit can print an error and still exit 0: require its marker.
    if ! grep -Eq 'No changes detected|Changes applied' "$schema_log"; then
      rm -f "$schema_log"
      log "Schema push did not confirm success (it may need a manual, possibly destructive, change)"
      return 1
    fi
    rm -f "$schema_log"
  fi

  log "Build API"
  pnpm --filter @workspace/api-server run build

  log "Restart API and switch site"
  pm2 restart "$PM2_NAME" >/dev/null
  mkdir -p "$(dirname "$SITE_DIR")"
  rm -rf "$SITE_DIR.old"
  if [ -d "$SITE_DIR" ]; then mv "$SITE_DIR" "$SITE_DIR.old"; fi
  mv "$STAGE_DIR" "$SITE_DIR"
  rm -rf "$SITE_DIR.old"

  for _ in $(seq 1 20); do
    if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  log "API did not become healthy"
  return 1
}

log "Deploy start: $(git log -1 --format='%h %s' "$current") -> $(git log -1 --format='%h %s' "$target")"
# errexit is ignored inside `if (...)`, so run each attempt as a plain
# subshell with errexit on and inspect its status afterwards.
set +e
(set -Eeuo pipefail; deploy_commit "$target" 1)
rc=$?
set -e
if [ "$rc" = 0 ]; then
  git update-ref -d refs/deploy/failed 2>/dev/null || true
  log "Deploy OK: $(git log -1 --format='%h %s' "$target")"
  exit 0
fi

log "Deploy FAILED, restoring previous version $(git log -1 --format='%h' "$current")"
set +e
(set -Eeuo pipefail; deploy_commit "$current" 0)
rc=$?
set -e
if [ "$rc" = 0 ]; then
  log "Rollback OK: live site is back on $(git log -1 --format='%h %s' "$current")"
else
  log "ROLLBACK FAILED: manual attention needed (pm2 logs $PM2_NAME)"
fi
# Remember the failed commit so the timer does not retry it every minute.
git update-ref "refs/deploy/failed" "$target"
exit 1
