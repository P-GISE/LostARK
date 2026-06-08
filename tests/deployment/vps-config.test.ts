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

  it("binds the app and database safely on the VPS host", () => {
    const compose = read("docker-compose.vps.yml");

    expect(compose).toContain('"127.0.0.1:3000:3000"');
    expect(compose).toContain(
      '"${POSTGRES_HOST_BIND:-127.0.0.1}:5432:5432"',
    );
  });

  it("copies TypeScript path config into the runner image for worker scripts", () => {
    const dockerfile = read("Dockerfile");

    expect(dockerfile).toContain(
      "COPY --from=builder /app/tsconfig.json ./tsconfig.json",
    );
  });

  it("keeps public Caddy exposure behind an explicit compose profile", () => {
    const compose = read("docker-compose.vps.yml");

    expect(compose).toContain("profiles:");
    expect(compose).toContain("- public");
    expect(compose).toContain("env_file: .env");
  });

  it("documents canonical production env values for VPS and PC runtimes", () => {
    const vpsEnv = read(".env.vps.example");
    const pcEnv = read(".env.pc-production.example");

    expect(vpsEnv).toContain("APP_BASE_URL=https://lostark-party.pigs0516.com");
    expect(vpsEnv).toContain("APP_DOMAIN=lostark-party.pigs0516.com");
    expect(vpsEnv).toContain(
      "DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback",
    );
    expect(vpsEnv).toContain("POSTGRES_HOST_BIND=127.0.0.1");

    expect(pcEnv).toContain("APP_BASE_URL=https://lostark-party.pigs0516.com");
    expect(pcEnv).toContain("APP_DOMAIN=lostark-party.pigs0516.com");
    expect(pcEnv).toContain(
      "DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback",
    );
    expect(pcEnv).toContain("DATABASE_URL=");
    expect(pcEnv).toContain("server-private-ip");
  });
});
