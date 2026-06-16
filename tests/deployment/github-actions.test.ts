import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/deploy-vps.yml", "utf8");
const bootstrapWorkflow = readFileSync(
  ".github/workflows/bootstrap-aws.yml",
  "utf8",
);

describe("GitHub Actions VPS deployment workflow", () => {
  it("deploys main branch pushes to the VPS over Tailscale SSH", () => {
    expect(workflow).toContain("name: Deploy VPS");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("Validate deploy secrets");
    expect(workflow).toContain("Missing deploy secret");
    expect(workflow).toContain("tailscale/github-action@v4");
    expect(workflow).toContain("secrets.TS_AUTHKEY");
    expect(workflow).toContain("secrets.VPS_HOST");
    expect(workflow).toContain("secrets.VPS_USER");
    expect(workflow).not.toContain("ping: ${{ secrets.VPS_HOST }}");
    expect(workflow).toContain("Check VPS host reachability");
    expect(workflow).toContain(
      'if ping_output="$(tailscale ping --c 1 --timeout 5s "${VPS_HOST}" 2>&1)"; then',
    );
    expect(workflow).toContain('grep -q "^pong from "');
    expect(workflow).toContain("VPS host did not respond on the tailnet");
    expect(workflow).toContain("steps.vps-host.outputs.reachable == 'true'");
    expect(workflow).toContain('tailscale ssh "${VPS_USER}@${VPS_HOST}"');
    expect(workflow).not.toContain("appleboy/ssh-action");
    expect(workflow).not.toContain("secrets.VPS_SSH_KEY");
  });

  it("provides a PostgreSQL test database for CI verification", () => {
    expect(workflow).toContain("services:");
    expect(workflow).toContain("postgres:");
    expect(workflow).toContain("postgres:17-alpine");
    expect(workflow).toContain("DATABASE_URL:");
    expect(workflow).toContain(
      "DISCORD_REDIRECT_URI: http://localhost:3000/api/discord/oauth/callback",
    );
    expect(workflow).toContain("npx prisma migrate deploy");
  });

  it("runs the VPS deploy and Tailscale Serve scripts on the server", () => {
    expect(workflow).toContain("bash scripts/vps-deploy.sh");
    expect(workflow).toContain("bash scripts/vps-tailscale-serve.sh");
  });

  it("can manually deploy the same app image to the AWS backup host", () => {
    expect(workflow).toContain("target:");
    expect(workflow).toContain("description: Server target to deploy");
    expect(workflow).toContain("default: vps");
    expect(workflow).toContain("- vps");
    expect(workflow).toContain("- aws");
    expect(workflow).toContain("- all");
    expect(workflow).toContain("deploy-aws:");
    expect(workflow).toContain("needs: [test, deploy]");
    expect(workflow).toContain(
      "${{ always() && needs.test.result == 'success' && (github.event_name == 'push' || inputs.target == 'aws' || inputs.target == 'all') && (github.event_name != 'push' || needs.deploy.result == 'success') }}",
    );
    expect(workflow).toContain("Validate AWS deploy secrets");
    expect(workflow).toContain("Missing AWS deploy secret");
    expect(workflow).toContain("Skipping AWS deploy");
    expect(workflow).toContain("AWS_HOST: ${{ secrets.AWS_HOST }}");
    expect(workflow).toContain("AWS_USER: ${{ secrets.AWS_USER }}");
    expect(workflow).toContain("AWS_APP_DIR: ${{ secrets.AWS_APP_DIR }}");
    expect(workflow).not.toContain("ping: ${{ secrets.AWS_HOST }}");
    expect(workflow).toContain("Check AWS host reachability");
    expect(workflow).toContain(
      'if ping_output="$(tailscale ping --c 1 --timeout 5s "${AWS_HOST}" 2>&1)"; then',
    );
    expect(workflow).toContain('grep -q "^pong from "');
    expect(workflow).toContain("AWS host did not respond on the tailnet");
    expect(workflow).toContain(
      "steps.aws-host.outputs.reachable == 'true'",
    );
    expect(workflow).toContain('tailscale ssh "${AWS_USER}@${AWS_HOST}"');
    expect(workflow).toContain('cd "${AWS_APP_DIR}"');
    expect(workflow).toContain("COMPOSE_BAKE=false bash scripts/vps-deploy.sh");
    expect(workflow).toContain("for attempt in $(seq 1 24); do");
    expect(workflow).toContain(
      "curl --connect-timeout 2 --max-time 10 -fsSI http://127.0.0.1:3000/",
    );
    expect(workflow).toContain("AWS web health check failed");
    expect(workflow).toContain("sleep 5");
    expect(workflow).toContain("sudo -n systemctl restart cloudflared");
  });

  it("normalizes production env on the VPS before deploy", () => {
    expect(workflow).toContain('SERVER_PRIVATE_IP="$(tailscale ip -4 | head -n 1)"');
    expect(workflow).toContain("bash scripts/run-node-script.sh scripts/normalize-production-env.mjs");
    expect(workflow).toContain("--postgres-host-bind");
    expect(workflow).toContain('"${SERVER_PRIVATE_IP}"');
  });
});

describe("GitHub Actions AWS bootstrap workflow", () => {
  it("bootstraps a replacement AWS host through public SSH and joins Tailscale", () => {
    expect(bootstrapWorkflow).toContain("name: Bootstrap AWS Backup");
    expect(bootstrapWorkflow).toContain("workflow_dispatch:");
    expect(bootstrapWorkflow).toContain("AWS_BOOTSTRAP_HOST");
    expect(bootstrapWorkflow).toContain("AWS_BOOTSTRAP_USER");
    expect(bootstrapWorkflow).toContain("AWS_BOOTSTRAP_SSH_KEY");
    expect(bootstrapWorkflow).toContain("AWS_ENV_FILE");
    expect(bootstrapWorkflow).toContain("AWS_CLOUDFLARED_TOKEN");
    expect(bootstrapWorkflow).toContain("TS_AUTHKEY");
    expect(bootstrapWorkflow).toContain(
      'ssh-keyscan -H "${AWS_BOOTSTRAP_HOST}" >> ~/.ssh/known_hosts || true',
    );
    expect(bootstrapWorkflow).toContain("StrictHostKeyChecking=accept-new");
    expect(bootstrapWorkflow).toContain('TAILSCALE_HOSTNAME="lostark-party-aws"');
    expect(bootstrapWorkflow).toContain("scripts/vps-bootstrap.sh");
    expect(bootstrapWorkflow).toContain("scripts/vps-deploy.sh");
    expect(bootstrapWorkflow).toContain("cloudflared service install");
    expect(bootstrapWorkflow).toContain(
      "cloudflared service was not installed",
    );
    expect(bootstrapWorkflow).toContain("systemctl is-active --quiet cloudflared");
    expect(bootstrapWorkflow).toContain("curl --connect-timeout 2 --max-time 10 -fsSI http://127.0.0.1:3000/");
    expect(bootstrapWorkflow).not.toContain("set -x");
  });
});
