#!/usr/bin/env bash
set -euo pipefail

bundle="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
revision="${1:?expected commit SHA}"
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid revision' >&2; exit 1; }
app_dir="${APP_DIR:-/opt/lostark-party}"
cd "$app_dir"
test -f .env && test -f docker-compose.vps.yml
exec 9>.app-deploy.lock
flock -n 9 || { echo 'Another app deployment is running' >&2; exit 1; }
if [ -e .app-deployment-in-progress ]; then
  echo 'PREVIOUS_DEPLOYMENT_REQUIRES_REVIEW: inspect the durable marker before retrying' >&2
  exit 1
fi
services=(web worker character-worker)
containers=(lostark-party-web-1 lostark-party-worker-1 lostark-party-character-worker-1)
old_image="$(docker inspect --format '{{.Image}}' "${containers[0]}")"
for container in "${containers[@]}"; do
  test "$(docker inspect --format '{{.Image}}' "$container")" = "$old_image"
  test "$(docker inspect --format '{{.State.Running}}' "$container")" = true
  test "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$container")" = "$app_dir"
done

# A schema/seed change needs a separate reviewed migration; this path has no bypass.
current_schema="$(docker exec "${containers[0]}" sh -c 'find prisma -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum')"
test -n "$current_schema"
if ! diff -u <(printf '%s\n' "$current_schema") "$bundle/prisma.sha256"; then
  echo 'SCHEMA_CHANGE_BLOCKED: approve a separate database migration first' >&2
  exit 1
fi
(cd "$bundle" && sha256sum --check image.tar.gz.sha256)
config_digest="$(python3 "$bundle/verify-app-image.py" "$bundle/image.tar.gz" "$revision")"
test "$config_digest" = "$(cat "$bundle/image-config-digest.txt")"

snapshot_protected() {
  local id name
  for id in $(docker ps -aq); do
    name="$(docker inspect --format '{{.Name}}' "$id")"
    case "$name" in
      /lostark-party-web-1|/lostark-party-worker-1|/lostark-party-character-worker-1) continue ;;
    esac
    docker inspect --format '{{.Id}} {{.State.StartedAt}}' "$id"
  done | LC_ALL=C sort
  systemctl show cloudflared --property=MainPID --value
}
protected_before="$(snapshot_protected)"
docker load --input "$bundle/image.tar.gz" >/dev/null
new_tag="lostark-party-app:$revision"
expected_image="$(docker image inspect --format '{{.Id}}' "$new_tag")"
[[ "$expected_image" =~ ^sha256:[0-9a-f]{64}$ ]]
test "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$new_tag")" = "$revision"
previous_state_exists=false
previous_state=''
if [ -f .last-app-deployment ]; then
  previous_state_exists=true
  previous_state="$(cat .last-app-deployment)"
fi

compose_app() {
  LOSTARK_RELEASE_IMAGE="$1" docker compose --project-name lostark-party \
    --project-directory "$app_dir" --env-file "$app_dir/.env" \
    -f "$app_dir/docker-compose.vps.yml" -f "$bundle/app-only.compose.yml" \
    up -d --no-deps --no-build --pull never "${services[@]}"
}
healthy() {
  local image="$1" container
  test "$(curl --connect-timeout 2 --max-time 10 -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)" = 200 || return 1
  for container in "${containers[@]}"; do
    test "$(docker inspect --format '{{.Image}} {{.State.Running}} {{.RestartCount}}' "$container")" = "$image true 0" || return 1
  done
}
wait_healthy() {
  local image="$1" attempt
  for attempt in $(seq 1 24); do
    if healthy "$image"; then
      sleep 5
      if healthy "$image"; then return 0; fi
    fi
    sleep 5
  done
  return 1
}
changed=false
finish() {
  local status=$?
  trap - EXIT
  trap '' TERM INT
  if [ "$status" -ne 0 ] && [ "$changed" = true ]; then
    printf 'failed %s %s\n' "$revision" "$old_image" > .app-deployment-in-progress
    echo "Deployment failed; restoring previous app image $old_image" >&2
    if compose_app "$old_image" && wait_healthy "$old_image"; then
      if [ "$previous_state_exists" = true ]; then
        printf '%s\n' "$previous_state" > .last-app-deployment.tmp
        mv .last-app-deployment.tmp .last-app-deployment
      else
        rm -f .last-app-deployment .last-app-deployment.tmp
      fi
      printf 'rolled-back %s %s\n' "$revision" "$old_image" > .app-deployment-in-progress
      echo 'ROLLBACK_OK: previous app image restored' >&2
    else
      printf 'rollback-failed %s %s\n' "$revision" "$old_image" > .app-deployment-in-progress
      echo 'ROLLBACK_FAILED: inspect app health before another deployment' >&2
    fi
  fi
  exit "$status"
}
trap finish EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
printf 'in-progress %s %s\n' "$revision" "$old_image" > .app-deployment-in-progress
changed=true
compose_app "$new_tag"
wait_healthy "$expected_image"
test "$(snapshot_protected)" = "$protected_before"
printf '%s %s %s\n' "$revision" "$expected_image" "$old_image" > .last-app-deployment.tmp
mv .last-app-deployment.tmp .last-app-deployment
rm -f .app-deployment-in-progress
changed=false
printf 'DEPLOYED revision=%s image=%s previous_image=%s\n' "$revision" "$expected_image" "$old_image"
