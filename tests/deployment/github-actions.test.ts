import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/deploy-vps.yml", "utf8").replaceAll(String.fromCharCode(13), "");
const bootstrapWorkflow = readFileSync(".github/workflows/bootstrap-aws.yml", "utf8");

describe("AWS app deployment boundaries", () => {
  const deploy = workflow.slice(workflow.indexOf("  deploy-aws:"));
  it("deploys tested main revisions while PRs only verify", () => {
    expect(workflow).toContain("pull_request:");
    expect(deploy).toContain("needs: test");
    expect(deploy).toContain("github.ref == 'refs/heads/main' && github.event_name != 'pull_request'");
    expect(deploy).toContain("ref: ${{ github.sha }}");
    expect(deploy).toContain('org.opencontainers.image.revision=${GITHUB_SHA}');
  });
  it("uses private SSH with a pinned server identity and fails missing credentials", () => {
    expect(deploy).toContain("Missing required deploy credential:");
    expect(deploy).toContain("StrictHostKeyChecking=yes");
    expect(deploy).toContain("deploy/aws.known_hosts");
    expect(deploy).not.toContain("ssh-keyscan");
    expect(deploy).not.toContain("AWS_BOOTSTRAP_HOST");
    expect(deploy).not.toContain("configured=false");
    expect(deploy).not.toContain("VPS_HOST");
  });
  it("keeps schema writes and shared infrastructure out of production deployment", () => {
    expect(workflow.slice(0, workflow.indexOf("  deploy-aws:"))).toContain("npx prisma migrate deploy");
    for (const forbidden of ["prisma migrate", "systemctl", "vps-deploy.sh", "tailscale serve", "git reset", "normalize-production-env"]) {
      expect(deploy).not.toContain(forbidden);
    }
    expect(deploy).toContain("deploy-aws-app.sh");
    expect(deploy).toContain("prisma.sha256");
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
    expect(bootstrapWorkflow).toContain("ServerAliveInterval=30");
    expect(bootstrapWorkflow).toContain("ServerAliveCountMax=20");
    expect(bootstrapWorkflow).toContain('TAILSCALE_HOSTNAME="lostark-party-aws"');
    expect(bootstrapWorkflow).toContain("TAILSCALE_SSH=false");
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
