import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDiscordDm } from "@/server/discord";

describe("discord adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a DM through the Discord REST API", async () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "bot-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "dm-channel-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);

    await sendDiscordDm("discord-user-1", "hello");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://discord.com/api/v10/users/@me/channels",
      {
        method: "POST",
        headers: {
          Authorization: "Bot bot-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: "discord-user-1" }),
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://discord.com/api/v10/channels/dm-channel-1/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Bot bot-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "hello" }),
      },
    );
  });

  it("accepts DISCORD_TOKEN as a bot token alias", async () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "");
    vi.stubEnv("DISCORD_TOKEN", "alias-token");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: "dm-channel-1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        }),
    );

    await expect(sendDiscordDm("discord-user-1", "hello")).resolves.toBeUndefined();
  });
});
