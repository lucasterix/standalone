#!/usr/bin/env bash
# Deploy der statischen Web-App auf den Hetzner-Server (46.224.7.46).
#
# Voraussetzungen (einmalig eingerichtet, 2026-07-17):
#   - nginx-Container `kontoklar_web` (Netz caddy_proxy) mountet
#     /home/deploy/apps/standalone-web/out  read-only
#   - Caddy-Vhost /home/deploy/infra/caddy/conf.d/kontoklar.caddy
#     (kontoklar.froehlichdienste.de -> kontoklar_web:80)
#   - DNS: A-Record kontoklar.froehlichdienste.de -> 46.224.7.46 (GoDaddy)
#
# Aufruf:  ./infra/deploy-web.sh [ssh-key]
set -euo pipefail
KEY="${1:-$HOME/.ssh/famora_hetzner_ed25519}"
HOST="root@46.224.7.46"
cd "$(dirname "$0")/../apps/web"

echo "→ Build (statischer Export)…"
npm run build

echo "→ Sync nach $HOST…"
rsync -az --delete out/ "$HOST:/home/deploy/apps/standalone-web/out/" \
  -e "ssh -i $KEY -o StrictHostKeyChecking=no"

echo "→ Fertig. Live-Check:"
curl -s -o /dev/null -w "   https://kontoklar.froehlichdienste.de/ → %{http_code}\n" \
  https://kontoklar.froehlichdienste.de/ || true
