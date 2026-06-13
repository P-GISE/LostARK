import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PC production startup config", () => {
  it("starts the PC app and Cloudflare connector together", () => {
    const script = readFileSync("scripts/start-pc-production.ps1", "utf8");

    expect(script).toContain("start-prod-server.ps1");
    expect(script).toContain("cloudflared.exe");
    expect(script).toContain("lostark-party-pc.yml");
    expect(script).toContain("Stop-Process");
    expect(script).toContain("Start-Process");
    expect(script).toContain("pc-cloudflared.pid");
    expect(script).toContain("https://lostark-party.pigs0516.com/");
    expect(script).toContain("https://pc.pigs0516.com/");
  });

  it("registers startup with the combined PC production launcher", () => {
    const script = readFileSync("scripts/register-startup-task.ps1", "utf8");

    expect(script).toContain("start-pc-production.ps1");
    expect(script).toContain("LostArk Party Planner Server");
    expect(script).toContain("-Port $Port");
  });

  it("checks PC production env before starting Next.js", () => {
    const script = readFileSync("scripts/start-prod-server.ps1", "utf8");

    expect(script).toContain("production-config.mjs");
    expect(script).toContain("--role");
    expect(script).toContain("pc");
    expect(script).toContain("$envFile = Join-Path $projectRoot \".env\"");
    expect(script).toContain("\"--env-file\" $envFile");
    expect(script).toContain("SKIP_PRODUCTION_CONFIG_CHECK");
  });
});
