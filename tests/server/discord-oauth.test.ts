import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDiscordAuthorizeUrl,
  parseDiscordOAuthState,
} from "@/server/discord-oauth";

describe("discord oauth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not build an authorize url until all OAuth secrets are configured", () => {
    vi.stubEnv("DISCORD_CLIENT_ID", "client-id");
    vi.stubEnv("DISCORD_CLIENT_SECRET", "");
    vi.stubEnv(
      "DISCORD_REDIRECT_URI",
      "https://example.com/api/discord/oauth/callback",
    );

    expect(getDiscordAuthorizeUrl("member-1")).toBeNull();
  });

  it("builds an authorize url when the OAuth client is configured", () => {
    vi.stubEnv("DISCORD_CLIENT_ID", "client-id");
    vi.stubEnv("DISCORD_CLIENT_SECRET", "client-secret");
    vi.stubEnv(
      "DISCORD_REDIRECT_URI",
      "https://example.com/api/discord/oauth/callback",
    );

    const url = getDiscordAuthorizeUrl("member-1");

    expect(url).toContain("https://discord.com/oauth2/authorize?");
    expect(url).toContain("client_id=client-id");
    expect(url).toContain("scope=identify");
    const parsed = new URL(url ?? "");
    const state = parsed.searchParams.get("state");

    expect(state).not.toBe("member-1");
    expect(parseDiscordOAuthState(state ?? "")).toEqual({
      memberId: "member-1",
    });
  });

  it("rejects unsigned or expired OAuth state values", () => {
    vi.stubEnv("DISCORD_CLIENT_ID", "client-id");
    vi.stubEnv("DISCORD_CLIENT_SECRET", "client-secret");
    vi.stubEnv(
      "DISCORD_REDIRECT_URI",
      "https://example.com/api/discord/oauth/callback",
    );

    expect(parseDiscordOAuthState("member-1")).toBeNull();

    const url = getDiscordAuthorizeUrl(
      "member-1",
      new Date("2026-06-06T12:00:00+09:00"),
    );
    const state = new URL(url ?? "").searchParams.get("state");

    expect(
      parseDiscordOAuthState(
        state ?? "",
        new Date("2026-06-06T12:11:00+09:00"),
      ),
    ).toBeNull();
  });
});
