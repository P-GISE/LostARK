import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/discord/oauth/callback/route";

const mocks = vi.hoisted(() => ({
  connectDiscordMember: vi.fn(),
  exchangeDiscordCodeForUserId: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/discord-oauth", () => ({
  exchangeDiscordCodeForUserId: mocks.exchangeDiscordCodeForUserId,
  parseDiscordOAuthState: vi.fn((state: string) =>
    state === "signed-member-1" ? { memberId: "member-1" } : null,
  ),
}));

vi.mock("@/server/members", () => ({
  connectDiscordMember: mocks.connectDiscordMember,
}));

describe("Discord OAuth callback route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("redirects to the configured public app url after connecting Discord", async () => {
    vi.stubEnv("APP_BASE_URL", "https://lostark-party.tail408126.ts.net");
    mocks.requireCurrentMember.mockResolvedValue({ id: "member-1" });
    mocks.exchangeDiscordCodeForUserId.mockResolvedValue("discord-user-1");

    const response = await GET(
      new Request(
        "https://0.0.0.0:3000/api/discord/oauth/callback?code=abc&state=signed-member-1",
      ),
    );

    expect(response.headers.get("Location")).toBe(
      "https://lostark-party.tail408126.ts.net/notifications?discord=connected",
    );
    expect(mocks.connectDiscordMember).toHaveBeenCalledWith({
      memberId: "member-1",
      discordUserId: "discord-user-1",
    });
  });

  it("redirects missing callback data to the configured public app url", async () => {
    vi.stubEnv("APP_BASE_URL", "https://lostark-party.tail408126.ts.net");

    const response = await GET(
      new Request("https://0.0.0.0:3000/api/discord/oauth/callback"),
    );

    expect(response.headers.get("Location")).toBe(
      "https://lostark-party.tail408126.ts.net/notifications?discord=missing",
    );
  });

  it("rejects unsigned OAuth state without connecting Discord", async () => {
    vi.stubEnv("APP_BASE_URL", "https://lostark-party.tail408126.ts.net");
    mocks.requireCurrentMember.mockResolvedValue({ id: "member-1" });

    const response = await GET(
      new Request(
        "https://0.0.0.0:3000/api/discord/oauth/callback?code=abc&state=member-1",
      ),
    );

    expect(response.headers.get("Location")).toBe(
      "https://lostark-party.tail408126.ts.net/notifications?discord=failed",
    );
    expect(mocks.connectDiscordMember).not.toHaveBeenCalled();
  });

  it("rejects OAuth state for a different logged-in member", async () => {
    vi.stubEnv("APP_BASE_URL", "https://lostark-party.tail408126.ts.net");
    mocks.requireCurrentMember.mockResolvedValue({ id: "member-2" });

    const response = await GET(
      new Request(
        "https://0.0.0.0:3000/api/discord/oauth/callback?code=abc&state=signed-member-1",
      ),
    );

    expect(response.headers.get("Location")).toBe(
      "https://lostark-party.tail408126.ts.net/notifications?discord=failed",
    );
    expect(mocks.connectDiscordMember).not.toHaveBeenCalled();
  });
});
