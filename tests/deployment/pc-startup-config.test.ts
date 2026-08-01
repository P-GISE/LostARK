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
    expect(script).toContain("https://pigs0516.com/");
    expect(script).toContain("https://www.pigs0516.com/");
    expect(script).toContain("https://pc.pigs0516.com/");
  });

  it("registers startup with the combined PC production launcher", () => {
    const script = readFileSync("scripts/register-startup-task.ps1", "utf8");

    expect(script).toContain("start-pc-production.ps1");
    expect(script).toContain("LostArk Party Planner Server");
    expect(script).toContain("-Port $Port");
    expect(script).toContain("-RestartApp");
  });

  it("updates startup with the combined PC production launcher", () => {
    const script = readFileSync("scripts/update-startup-task-port.ps1", "utf8");

    expect(script).toContain("start-pc-production.ps1");
    expect(script).toContain("LostArk Party Planner Server");
    expect(script).toContain("-Port $Port");
    expect(script).toContain("-RestartApp");
    expect(script).not.toContain("start-prod-server.ps1");
  });

  it("waits for the local origin and rejects mismatched tunnel ports", () => {
    const script = readFileSync("scripts/start-pc-production.ps1", "utf8");

    expect(script).toContain("Wait-LocalOrigin");
    expect(script).toContain("OriginHealthTimeoutSeconds");
    expect(script).toContain("RequiredTunnelHostnames");
    expect(script).toContain("pigs0516.com");
    expect(script).toContain("www.pigs0516.com");
    expect(script).toContain("Cloudflare tunnel config does not route");
    expect(script).toContain("http://127\\.0\\.0\\.1:$OriginPort\\b");
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

  it("passes launcher options without enumerating duplicated inherited environment variables", () => {
    const script = readFileSync("scripts/start-prod-server.ps1", "utf8");
    const launcher = readFileSync("scripts/prod-server-launcher.mjs", "utf8");

    expect(script).toContain("System.Diagnostics.ProcessStartInfo");
    expect(script).toContain("$startInfo.FileName = $node");
    expect(script).toContain("$startInfo.Arguments = $launcherArguments");
    expect(script).toContain("--port");
    expect(script).toContain("--hostname");
    expect(script).not.toContain('set `"PORT=$port`"');
    expect(script).not.toContain('set `"PROD_SERVER_HOSTNAME=$hostname`"');
    expect(launcher).toContain("process.argv");
    expect(launcher).toContain('"--port"');
    expect(launcher).toContain('"--hostname"');
  });
});
