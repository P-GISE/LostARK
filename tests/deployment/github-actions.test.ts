import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/deploy-vps.yml", "utf8").replaceAll(String.fromCharCode(13), "");
const bootstrapWorkflow = readFileSync(".github/workflows/bootstrap-aws.yml", "utf8");

// The generator emits a JSON-compatible YAML flow array; no extra parser dependency.
function hasSecurityAndTestPrerequisites(job: string): boolean {
  const value = job.match(/^    needs:\s*(.+)$/m)?.[1];
  if (!value) return false;
  try {
    const needs: unknown = JSON.parse(value);
    return Array.isArray(needs) && needs.length === 2 && new Set(needs).size === 2
      && needs.includes("security") && needs.includes("test");
  } catch {
    return false;
  }
}

const pinnedUpload = "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02";

describe("AWS app deployment boundaries", () => {
  const deploy = workflow.slice(workflow.indexOf("  publish-aws:"));
  it("deploys tested main revisions while PRs only verify", () => {
    expect(workflow).toContain("pull_request:");
    expect(hasSecurityAndTestPrerequisites(deploy)).toBe(true);
    expect(deploy).toContain("github.ref == 'refs/heads/main' && github.event_name == 'push'");
    expect(deploy).toContain("ref: ${{ github.sha }}");
    expect(deploy).toContain('org.opencontainers.image.revision=${GITHUB_SHA}');
  });
  it("publishes artifacts without runner infrastructure credentials", () => {
    for (const forbidden of ["TS_AUTHKEY", "AWS_BOOTSTRAP_SSH_KEY", "tailscale/github-action", "ssh ", "scp "]) {
      expect(deploy).not.toContain(forbidden);
    }
    expect(deploy).toContain(pinnedUpload);
    expect(deploy).toContain("retention-days: 7");
  });
  it("rejects missing security gates, duplicate prerequisites and mutable upload refs", () => {
    for (const needs of ['test', '["test"]', '["security"]', '["test", "test"]',
      '["security", "test", "test"]']) {
      expect(hasSecurityAndTestPrerequisites(`    needs: ${needs}\n`)).toBe(false);
    }
    expect(hasSecurityAndTestPrerequisites('    needs: ["test", "security"]\n')).toBe(true);
    expect(pinnedUpload).toMatch(/^actions\/upload-artifact@[0-9a-f]{40}$/);
    for (const mutable of ["actions/upload-artifact@v4", "actions/upload-artifact@main"]) {
      expect(deploy).not.toContain(mutable);
    }
  });
  it("keeps schema writes and shared infrastructure out of production deployment", () => {
    expect(workflow.slice(0, workflow.indexOf("  publish-aws:"))).toContain("npx prisma migrate deploy");
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
