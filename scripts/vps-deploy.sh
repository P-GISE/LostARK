#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

ENV_FILE="${ENV_FILE:-.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-lostark-party}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing ${ENV_FILE}. Copy .env.vps.example to ${ENV_FILE} and fill secrets first." >&2
  exit 1
fi

env_value() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2-
}

docker_cli() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
    sudo -n docker "$@"
    return
  fi

  echo "Docker is not available to this user. Grant docker access or passwordless sudo for docker." >&2
  exit 1
}

docker_compose() {
  docker_cli compose "$@"
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

bash scripts/run-node-script.sh scripts/production-config.mjs --role server --env-file "${ENV_FILE}"

if [ "$(env_value "POSTGRES_PASSWORD")" = "lostark" ]; then
  echo "POSTGRES_PASSWORD must not use the old default password." >&2
  exit 1
fi

if [ "${PRUNE_DOCKER_CACHE:-false}" = "true" ]; then
  echo "Pruning Docker build cache before rebuild..."
  docker_cli builder prune -af
fi

docker_cli build -t lostark-party-app:latest .
docker_compose -f docker-compose.vps.yml --env-file "${ENV_FILE}" up -d
docker_compose -f docker-compose.vps.yml --env-file "${ENV_FILE}" ps
