import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getBotHealth } from "@/app/api/bot/health/route";
import { GET as getBotGuildContext } from "@/app/api/bot/guilds/[discordGuildId]/context/route";
import { GET as getBotOutbox } from "@/app/api/bot/outbox/route";
import { POST as markBotOutboxFailedRoute } from "@/app/api/bot/outbox/[messageId]/mark-failed/route";
import { POST as markBotOutboxSentRoute } from "@/app/api/bot/outbox/[messageId]/mark-sent/route";
import { createBotOutboxMessage } from "@/server/bot-outbox";
import { createGroupWithLeader } from "@/server/groups";
import { updateGroupOperationalSettings } from "@/server/group-settings";

const BOT_AUTH_FIXTURE = "fixture-bot-auth";

function botRequest(
  path: string,
  authValue = BOT_AUTH_FIXTURE,
  init?: RequestInit,
) {
  return new Request(`https://example.test${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${authValue}`,
      ...(init?.headers ?? {}),
    },
  });
}

describe("bot API routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires a valid bearer token for health checks", async () => {
    // Given
    vi.stubEnv("LOSTARK_BOT_API_TOKEN", BOT_AUTH_FIXTURE);

    // When
    const missing = await getBotHealth(new Request("https://example.test/api/bot/health"));
    const invalid = await getBotHealth(botRequest("/api/bot/health", "invalid-auth"));
    const valid = await getBotHealth(botRequest("/api/bot/health"));

    // Then
    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    await expect(valid.json()).resolves.toEqual({ ok: true });
  });

  it("returns mapped group context for a Discord guild", async () => {
    // Given
    vi.stubEnv("LOSTARK_BOT_API_TOKEN", BOT_AUTH_FIXTURE);
    const discordGuildId = `guild-${randomUUID()}`;
    const { group, leader } = await createGroupWithLeader({
      groupName: "봇 매핑 공대",
      leaderNickname: "리더",
    });
    await updateGroupOperationalSettings({
      actorMemberId: leader.id,
      availabilityChangeNoticeEnabled: false,
      dailyDiscordSummaryEnabled: false,
      dailyDiscordSummaryTime: "09:00",
      discordAnnouncementChannelId: "announcement-1",
      discordGuildId,
      discordRecruitmentChannelId: "recruitment-1",
      groupId: group.id,
      raidReminderLeadMinutes: 60,
      timetableEndHour: 4,
      timetableStartHour: 8,
    });

    // When
    const response = await getBotGuildContext(
      botRequest(`/api/bot/guilds/${discordGuildId}/context`),
      { params: { discordGuildId } },
    );
    const missing = await getBotGuildContext(
      botRequest("/api/bot/guilds/missing/context"),
      { params: { discordGuildId: "missing" } },
    );

    // Then
    await expect(response.json()).resolves.toMatchObject({
      discord: {
        announcementChannelId: "announcement-1",
        guildId: discordGuildId,
        recruitmentChannelId: "recruitment-1",
      },
      group: {
        id: group.id,
        name: "봇 매핑 공대",
      },
    });
    expect(missing.status).toBe(404);
  });

  it("lists pending outbox messages and records delivery result", async () => {
    // Given
    vi.stubEnv("LOSTARK_BOT_API_TOKEN", BOT_AUTH_FIXTURE);
    const { group } = await createGroupWithLeader({
      groupName: "봇 라우트 공대",
      leaderNickname: "리더",
    });
    const queued = await createBotOutboxMessage({
      discordChannelId: "channel-1",
      discordGuildId: "guild-1",
      groupId: group.id,
      payload: { content: "전송할 메시지" },
    });
    const failed = await createBotOutboxMessage({
      discordChannelId: "channel-1",
      discordGuildId: "guild-1",
      groupId: group.id,
      payload: { content: "실패할 메시지" },
    });

    // When
    const listed = await getBotOutbox(botRequest("/api/bot/outbox"));
    const sentResponse = await markBotOutboxSentRoute(
      botRequest(`/api/bot/outbox/${queued.id}/mark-sent`, BOT_AUTH_FIXTURE, {
        method: "POST",
      }),
      { params: { messageId: queued.id } },
    );
    const failedResponse = await markBotOutboxFailedRoute(
      botRequest(`/api/bot/outbox/${failed.id}/mark-failed`, BOT_AUTH_FIXTURE, {
        body: JSON.stringify({ reason: "Missing Access" }),
        method: "POST",
      }),
      { params: { messageId: failed.id } },
    );

    // Then
    const listedJson = (await listed.json()) as { messages: Array<{ id: string }> };
    expect(listedJson.messages.map((message) => message.id)).toContain(queued.id);
    await expect(sentResponse.json()).resolves.toEqual({
      id: queued.id,
      status: "SENT",
    });
    await expect(failedResponse.json()).resolves.toEqual({
      id: failed.id,
      status: "FAILED",
    });
  });
});
