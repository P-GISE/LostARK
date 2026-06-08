#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ "$#" -lt 1 ]; then
  echo "Usage: bash scripts/run-node-script.sh <script> [args...]" >&2
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  node "$@"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Missing node and docker. Install one of them before running Node scripts." >&2
  exit 1
fi

docker run --rm -v "$(pwd):/app" -w /app node:24-alpine node "$@"
