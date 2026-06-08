import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PC production startup config", () => {
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
