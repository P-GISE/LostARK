import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("VPS deployment config", () => {
  it("keeps local secrets and generated files out of Docker build context", () => {
    const dockerignore = read(".dockerignore");

    expect(dockerignore).toContain(".env");
    expect(dockerignore).toContain(".env.local");
    expect(dockerignore).toContain(".env.production");
    expect(dockerignore).toContain("*.log");
    expect(dockerignore).toContain("node_modules");
    expect(dockerignore).toContain(".next");
    expect(dockerignore).toContain(".git");
  });

  it("requires VPS database credentials from environment variables", () => {
    const compose = read("docker-compose.vps.yml");
    const envExample = read(".env.vps.example");

    expect(compose).not.toContain("POSTGRES_PASSWORD: lostark");
    expect(compose).toContain(
      "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}",
    );
    expect(envExample).toContain("POSTGRES_PASSWORD=");
    expect(envExample).not.toContain("DATABASE_URL=postgresql://lostark:lostark@");
  });

  it("binds the app to localhost for Tailscale Serve on the VPS host", () => {
    const compose = read("docker-compose.vps.yml");

    expect(compose).toContain('"127.0.0.1:3000:3000"');
  });

  it("keeps public Caddy exposure behind an explicit compose profile", () => {
    const compose = read("docker-compose.vps.yml");

    expect(compose).toContain("profiles:");
    expect(compose).toContain("- public");
    expect(compose).toContain("env_file: .env");
  });
});
