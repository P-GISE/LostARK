#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

ENV_FILE="${ENV_FILE:-.env}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing ${ENV_FILE}. Copy .env.vps.example to ${ENV_FILE} and fill secrets first." >&2
  exit 1
fi

env_value() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2-
}

require_env() {
  local key="$1"
  local value
  value="$(env_value "${key}")"

  if [ -z "${value}" ]; then
    echo "Missing ${key} in ${ENV_FILE}." >&2
    exit 1
  fi

  if printf '%s' "${value}" | grep -q "replace-with"; then
    echo "${key} still contains a placeholder value." >&2
    exit 1
  fi
}

require_env "POSTGRES_PASSWORD"
require_env "DATABASE_URL"
require_env "APP_BASE_URL"
require_env "SESSION_SECRET"

node scripts/production-config.mjs --role server --env-file "${ENV_FILE}"

if [ "$(env_value "POSTGRES_PASSWORD")" = "lostark" ]; then
  echo "POSTGRES_PASSWORD must not use the old default password." >&2
  exit 1
fi

docker compose -f docker-compose.vps.yml --env-file "${ENV_FILE}" up -d --build
docker compose -f docker-compose.vps.yml --env-file "${ENV_FILE}" ps
