#!/usr/bin/env bash
# One-time setup of the BambooStudio update command on the VPS (run as root):
#   bash /var/www/bamboo/scripts/vps/install-autodeploy.sh
# Installs /usr/local/bin/bamboo-deploy and a systemd service for it. Updates
# run only on demand (no timer). Re-run after changing deploy.sh.
set -euo pipefail
APP_DIR=/var/www/bamboo
BRANCH=${DEPLOY_BRANCH:-ver4.0}

install -m 0755 "$APP_DIR/scripts/vps/deploy.sh" /usr/local/bin/bamboo-deploy
grep -qx '.deploy-stage' "$APP_DIR/.git/info/exclude" 2>/dev/null \
  || echo '.deploy-stage' >> "$APP_DIR/.git/info/exclude"

cat > /etc/systemd/system/bamboo-deploy.service <<UNIT
[Unit]
Description=BambooStudio update from GitHub ($BRANCH)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
Environment=HOME=/root
Environment=DEPLOY_BRANCH=$BRANCH
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/usr/local/bin/bamboo-deploy
TimeoutStartSec=30min
UNIT

cat > /etc/logrotate.d/bamboo-deploy <<'ROT'
/var/log/bamboo-deploy.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
}
ROT

# Remove the every-minute timer from earlier setups, if present.
systemctl disable --now bamboo-deploy.timer 2>/dev/null || true
rm -f /etc/systemd/system/bamboo-deploy.timer
systemctl daemon-reload
echo "Update command installed (branch $BRANCH). Run: bamboo-deploy"
echo "Log: tail -n 30 /var/log/bamboo-deploy.log"
