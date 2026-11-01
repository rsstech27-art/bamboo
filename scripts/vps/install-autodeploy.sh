#!/usr/bin/env bash
# One-time setup of BambooStudio auto-deploy on the VPS (run as root):
#   bash /var/www/bamboo/scripts/vps/install-autodeploy.sh
# Installs /usr/local/bin/bamboo-deploy and a systemd timer that runs it every
# minute. Re-run after changing deploy.sh to install the new version.
set -euo pipefail
APP_DIR=/var/www/bamboo
BRANCH=${DEPLOY_BRANCH:-ver4.0}

install -m 0755 "$APP_DIR/scripts/vps/deploy.sh" /usr/local/bin/bamboo-deploy
grep -qx '.deploy-stage' "$APP_DIR/.git/info/exclude" 2>/dev/null \
  || echo '.deploy-stage' >> "$APP_DIR/.git/info/exclude"

cat > /etc/systemd/system/bamboo-deploy.service <<UNIT
[Unit]
Description=BambooStudio auto-deploy from GitHub ($BRANCH)
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

cat > /etc/systemd/system/bamboo-deploy.timer <<UNIT
[Unit]
Description=Check GitHub for BambooStudio updates every minute

[Timer]
OnBootSec=2min
OnUnitInactiveSec=1min
Unit=bamboo-deploy.service

[Install]
WantedBy=timers.target
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

systemctl daemon-reload
systemctl enable --now bamboo-deploy.timer
echo "Auto-deploy installed: branch $BRANCH, checked every minute."
echo "Log: tail -f /var/log/bamboo-deploy.log"
