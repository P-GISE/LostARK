import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const { validateProductionEnv } = await import(
  "../../scripts/production-config.mjs"
);

const shared = {
  APP_BASE_URL: "https://lostark-party.pigs0516.com",
  APP_DOMAIN: "lostark-party.pigs0516.com",
  SESSION_COOKIE_NAME: "lostark_party_member",
  SESSION_SECRET: "12345678901234567890123456789012",
  ADMIN_EMAILS: "admin@example.com",
  DISCORD_CLIENT_ID: "discord-client",
  DISCORD_CLIENT_SECRET: "discord-secret",
  DISCORD_BOT_TOKEN: "discord-bot",
  DISCORD_REDIRECT_URI:
    "https://lostark-party.pigs0516.com/api/discord/oauth/callback",
  LOSTARK_OPEN_API_JWT: "lostark-jwt",
};

function writeEnv(values: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "lostark-production-env-"));
  const file = join(dir, ".env");
  writeFileSync(
    file,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n"),
  );
  return file;
}

describe("production config validator", () => {
  it("accepts PC production config that points at a private server database", () => {
    const envFile = writeEnv({
      ...shared,
      DATABASE_URL:
        "postgresql://lostark:secret@100.64.0.10:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "pc" })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects PC production config that points at localhost without an explicit local database flag", () => {
    const envFile = writeEnv({
      ...shared,
      DATABASE_URL:
        "postgresql://lostark:secret@127.0.0.1:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "pc" })).toEqual({
      ok: false,
      errors: [
        "PC production DATABASE_URL must point at the shared server database unless PC_ALLOW_LOCAL_DATABASE=true is set.",
      ],
    });
  });

  it("accepts PC production config that explicitly uses the local database", () => {
    const envFile = writeEnv({
      ...shared,
      PC_ALLOW_LOCAL_DATABASE: "true",
      DATABASE_URL:
        "postgresql://lostark:secret@127.0.0.1:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "pc" })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("accepts server Docker config that points at the compose postgres service", () => {
    const envFile = writeEnv({
      ...shared,
      DATABASE_URL: "postgresql://lostark:secret@postgres:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "server" })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects production config with non-canonical public URL values", () => {
    const envFile = writeEnv({
      ...shared,
      APP_BASE_URL: "https://lostark-party.tail408126.ts.net",
      APP_DOMAIN: "lostark-party.tail408126.ts.net",
      DISCORD_REDIRECT_URI:
        "https://lostark-party.tail408126.ts.net/api/discord/oauth/callback",
      DATABASE_URL: "postgresql://lostark:secret@postgres:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "server" })).toEqual({
      ok: false,
      errors: [
        "APP_BASE_URL must be https://lostark-party.pigs0516.com.",
        "APP_DOMAIN must be lostark-party.pigs0516.com.",
        "DISCORD_REDIRECT_URI must be https://lostark-party.pigs0516.com/api/discord/oauth/callback.",
      ],
    });
  });
});
