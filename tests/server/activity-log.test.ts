import { describe, expect, it } from "vitest";
import {
  listGroupActivityLogs,
  writeGroupActivityLog,
} from "@/server/activity-log";
import { createGroupWithLeader } from "@/server/groups";

describe("activity log", () => {
  it("records and lists group activity newest first", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "활동 기록 공대",
      leaderNickname: "리더",
    });

    // When
    await writeGroupActivityLog({
      actionType: "SET_CREATED",
      actorMemberId: leader.id,
      groupId: group.id,
      summary: "리더가 아칸 세트를 만들었습니다",
      targetId: "set-1",
      targetType: "RaidSet",
    });

    const logs = await listGroupActivityLogs(group.id);

    // Then
    expect(logs[0]).toMatchObject({
      actionType: "SET_CREATED",
      summary: "리더가 아칸 세트를 만들었습니다",
      targetType: "RaidSet",
    });
    expect(logs[0]?.actorMember?.nickname).toBe("리더");
  });
});
