#!/usr/bin/env bash
set -euo pipefail

TAILSCALE_HOSTNAME="${TAILSCALE_HOSTNAME:-lostark-party}"
TAILSCALE_SSH="${TAILSCALE_SSH:-true}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This bootstrap script expects an Ubuntu/Debian VPS with apt-get." >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg |
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" |
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

sudo systemctl enable --now docker

if [ -n "${SUDO_USER:-}" ]; then
  sudo usermod -aG docker "${SUDO_USER}"
fi

if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

sudo systemctl enable --now tailscaled

if [ "${TAILSCALE_SSH}" = "true" ]; then
  tailscale_ssh_args=(--ssh)
else
  tailscale_ssh_args=(--ssh=false --accept-risk=lose-ssh)
fi

if [ -n "${TAILSCALE_AUTHKEY:-}" ]; then
  sudo tailscale up --auth-key "${TAILSCALE_AUTHKEY}" "${tailscale_ssh_args[@]}" --hostname "${TAILSCALE_HOSTNAME}"
else
  echo "Run this on the VPS to join the tailnet:"
  printf 'sudo tailscale up'
  printf ' %q' "${tailscale_ssh_args[@]}"
  printf ' --hostname %q\n' "${TAILSCALE_HOSTNAME}"
fi

echo "Bootstrap finished. Reconnect SSH once if your user was added to the docker group."
