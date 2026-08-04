#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SH_ROOT="/var/www/x12/sh/browser"
RCO_ROOT="/var/www/x12/rco/browser"
BACKEND_ROOT="/opt/x12/backend"

echo "== X12 Linux Publish =="
echo "Repo: $ROOT_DIR"

echo "1) Build Angular SH + RCO"
cd "$ROOT_DIR"
npm ci
npm run build:all

echo "2) Publish backend"
dotnet publish "$ROOT_DIR/src/backend/TpManageSync.Api.csproj" -c Release -o "$ROOT_DIR/out/backend"

echo "3) Copy frontend"
sudo mkdir -p "$SH_ROOT" "$RCO_ROOT"
sudo rsync -a --delete "$ROOT_DIR/dist/SH/browser/" "$SH_ROOT/"
sudo rsync -a --delete "$ROOT_DIR/dist/RCO/browser/" "$RCO_ROOT/"

echo "4) Copy backend"
sudo mkdir -p "$BACKEND_ROOT"
sudo rsync -a --delete "$ROOT_DIR/out/backend/" "$BACKEND_ROOT/"

echo "Done."
echo "Next: restart backend service and reload nginx"
echo "  sudo systemctl restart tpmanagesync-api"
echo "  sudo systemctl reload nginx"
