import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const { normalizeProductionEnv } = await import(
  "../../scripts/normalize-production-env.mjs"
);

function writeEnv(content: string) {
  const dir = mkdtempSync(join(tmpdir(), "lostark-normalize-env-"));
  const file = join(dir, ".env");
  writeFileSync(file, content);
  return file;
}

describe("production env normalizer", () => {
  it("canonicalizes public app values while preserving existing secrets", () => {
    const envFile = writeEnv([
      "POSTGRES_PASSWORD=keep-db-password",
      "DATABASE_URL=postgresql://lostark:keep-db-password@postgres:5432/lostark_party",
      "APP_BASE_URL=https://lostark-party.tail408126.ts.net",
      "APP_DOMAIN=lostark-party.tail408126.ts.net",
      "SESSION_SECRET=keep-session-secret",
      "DISCORD_CLIENT_SECRET=keep-discord-secret",
      "DISCORD_REDIRECT_URI=https://lostark-party.tail408126.ts.net/api/discord/oauth/callback",
    ].join("\n"));

    normalizeProductionEnv(envFile, { postgresHostBind: "100.64.114.105" });

    const normalized = readFileSync(envFile, "utf8");

    expect(normalized).toContain("POSTGRES_PASSWORD=keep-db-password");
    expect(normalized).toContain(
      "DATABASE_URL=postgresql://lostark:keep-db-password@postgres:5432/lostark_party",
    );
    expect(normalized).toContain("SESSION_SECRET=keep-session-secret");
    expect(normalized).toContain("DISCORD_CLIENT_SECRET=keep-discord-secret");
    expect(normalized).toContain("POSTGRES_HOST_BIND=100.64.114.105");
    expect(normalized).toContain(
      "APP_BASE_URL=https://lostark-party.pigs0516.com",
    );
    expect(normalized).toContain("APP_DOMAIN=lostark-party.pigs0516.com");
    expect(normalized).toContain(
      "DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback",
    );
    expect(normalized).toContain("SESSION_COOKIE_NAME=lostark_party_member");
  });
});
