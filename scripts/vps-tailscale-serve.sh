#!/usr/bin/env bash
set -euo pipefail

if ! command -v tailscale >/dev/null 2>&1; then
  echo "tailscale is not installed. Run scripts/vps-bootstrap.sh first." >&2
  exit 1
fi

if [ "$(id -u)" -eq 0 ]; then
  tailscale serve --bg 3000
  tailscale serve status
else
  sudo tailscale serve --bg 3000
  sudo tailscale serve status
fi
