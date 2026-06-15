import { describe, expect, it } from "vitest";
import { createGroupWithLeader } from "@/server/groups";
import {
  getGroupOperationalSettings,
  updateGroupOperationalSettings,
} from "@/server/group-settings";
import { joinGroupByInvite } from "@/server/members";

describe("group settings", () => {
  it("creates default operational settings on first read", async () => {
    // Given
    const { group } = await createGroupWithLeader({
      groupName: "설정 기본값 공대",
      leaderNickname: "리더",
    });

    // When
    const settings = await getGroupOperationalSettings(group.id);

    // Then
    expect(settings.timetableStartHour).toBe(8);
    expect(settings.timetableEndHour).toBe(4);
    expect(settings.raidReminderLeadMinutes).toBe(60);
  });

  it("allows leaders to update timetable and notification settings", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "설정 변경 공대",
      leaderNickname: "리더",
    });

    // When
    const updated = await updateGroupOperationalSettings({
      actorMemberId: leader.id,
      availabilityChangeNoticeEnabled: true,
      dailyDiscordSummaryEnabled: true,
      dailyDiscordSummaryTime: "11:30",
      groupId: group.id,
      raidReminderLeadMinutes: 30,
      timetableEndHour: 2,
      timetableStartHour: 10,
    });

    // Then
    expect(updated.timetableStartHour).toBe(10);
    expect(updated.dailyDiscordSummaryEnabled).toBe(true);
    expect(updated.raidReminderLeadMinutes).toBe(30);
  });

  it("rejects members without settings permission", async () => {
    // Given
    const { group } = await createGroupWithLeader({
      groupName: "설정 차단 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "일반멤버",
    });

    // When / Then
    await expect(
      updateGroupOperationalSettings({
        actorMemberId: member.id,
        availabilityChangeNoticeEnabled: false,
        dailyDiscordSummaryEnabled: false,
        dailyDiscordSummaryTime: "09:00",
        groupId: group.id,
        raidReminderLeadMinutes: 60,
        timetableEndHour: 2,
        timetableStartHour: 10,
      }),
    ).rejects.toThrow("공대 설정 권한이 필요합니다");
  });
});
