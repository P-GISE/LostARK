import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("VPS helper scripts", () => {
  it("bootstraps Docker and Tailscale on an Ubuntu VPS", () => {
    const script = read("scripts/vps-bootstrap.sh");

    expect(script).toContain("set -euo pipefail");
    expect(script).toContain("docker-ce");
    expect(script).toContain("tailscale.com/install.sh");
    expect(script).toContain("--hostname \"${TAILSCALE_HOSTNAME}\"");
  });

  it("deploys the compose stack after checking production secrets", () => {
    const script = read("scripts/vps-deploy.sh");

    expect(script).toContain("POSTGRES_PASSWORD");
    expect(script).toContain("SESSION_SECRET");
    expect(script).toContain("replace-with");
    expect(script).toContain("docker info");
    expect(script).toContain("sudo -n docker info");
    expect(script).toContain("sudo -n docker compose");
    expect(script).toContain(
      "docker_compose -f docker-compose.vps.yml --env-file \"${ENV_FILE}\" up -d --build",
    );
  });

  it("checks server production env before deploying compose", () => {
    const script = read("scripts/vps-deploy.sh");

    expect(script).toContain("bash scripts/run-node-script.sh");
    expect(script).toContain("scripts/production-config.mjs");
    expect(script).toContain("--role server");
    expect(script).toContain("--env-file \"${ENV_FILE}\"");
  });

  it("runs Node scripts through Docker when host Node is unavailable", () => {
    const script = read("scripts/run-node-script.sh");

    expect(script).toContain("command -v node");
    expect(script).toContain("docker run --rm");
    expect(script).toContain("sudo -n docker run --rm");
    expect(script).toContain("node:24-alpine");
    expect(script).toContain("node \"$@\"");
  });

  it("publishes the local web port through Tailscale Serve", () => {
    const script = read("scripts/vps-tailscale-serve.sh");

    expect(script).toContain("tailscale serve --bg 3000");
    expect(script).toContain("tailscale serve status");
  });
});
