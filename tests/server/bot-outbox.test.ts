import { describe, expect, it } from "vitest";
import {
  createBotOutboxMessage,
  listPendingBotOutboxMessages,
  markBotOutboxFailed,
  markBotOutboxSent,
  serializeBotOutboxMessage,
} from "@/server/bot-outbox";
import { createGroupWithLeader } from "@/server/groups";

describe("bot outbox", () => {
  it("queues pending Discord channel messages and marks delivery state", async () => {
    // Given
    const { group } = await createGroupWithLeader({
      groupName: "봇 아웃박스 공대",
      leaderNickname: "리더",
    });
    const queued = await createBotOutboxMessage({
      discordChannelId: "channel-1",
      discordGuildId: "guild-1",
      groupId: group.id,
      payload: {
        content: "모집 알림",
        embeds: [{ title: "아칸 하드" }],
      },
    });

    // When
    const pending = await listPendingBotOutboxMessages();
    const serialized = serializeBotOutboxMessage(queued);
    const sent = await markBotOutboxSent(queued.id, new Date("2030-06-05T00:00:00Z"));
    const failed = await createBotOutboxMessage({
      discordChannelId: "channel-2",
      discordGuildId: "guild-1",
      groupId: group.id,
      payload: { content: "실패 알림" },
    });
    const markedFailed = await markBotOutboxFailed(failed.id, "Missing Access");

    // Then
    expect(pending.map((message) => message.id)).toContain(queued.id);
    expect(serialized.payload.content).toBe("모집 알림");
    expect(sent.status).toBe("SENT");
    expect(sent.sentAt).toEqual(new Date("2030-06-05T00:00:00Z"));
    expect(markedFailed.status).toBe("FAILED");
    expect(markedFailed.failureReason).toBe("Missing Access");
  });
});

