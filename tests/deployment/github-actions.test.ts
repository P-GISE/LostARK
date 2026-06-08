import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/deploy-vps.yml", "utf8");

describe("GitHub Actions VPS deployment workflow", () => {
  it("deploys main branch pushes to the VPS over SSH", () => {
    expect(workflow).toContain("name: Deploy VPS");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("appleboy/ssh-action");
    expect(workflow).toContain("secrets.VPS_HOST");
    expect(workflow).toContain("secrets.VPS_USER");
    expect(workflow).toContain("secrets.VPS_SSH_KEY");
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

  it("normalizes production env on the VPS before deploy", () => {
    expect(workflow).toContain('SERVER_PRIVATE_IP="$(tailscale ip -4 | head -n 1)"');
    expect(workflow).toContain("node scripts/normalize-production-env.mjs");
    expect(workflow).toContain("--postgres-host-bind");
    expect(workflow).toContain('"${SERVER_PRIVATE_IP}"');
  });
});
