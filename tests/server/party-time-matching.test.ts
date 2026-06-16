import { describe, expect, it } from "vitest";
import { setAvailabilitySlot } from "@/server/availability";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { getPartyTimeMatches } from "@/server/party-time-matching";
import { createRaidTemplate } from "@/server/raid-templates";
import { assignScheduleSlot, createScheduleFromTemplate } from "@/server/schedules";

describe("party time matching", () => {
  it("ranks all-available party slots before tentative and unavailable slots", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "Party Match",
      leaderNickname: "Leader",
    });
    const memberA = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Alpha",
    });
    const memberB = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Beta",
    });

    for (const member of [leader, memberA, memberB]) {
      await setAvailabilitySlot({
        date: "2030-06-05",
        hour: 21,
        memberId: member.id,
        status: "AVAILABLE",
      });
    }
    await setAvailabilitySlot({
      date: "2030-06-05",
      hour: 22,
      memberId: leader.id,
      status: "AVAILABLE",
    });
    await setAvailabilitySlot({
      date: "2030-06-05",
      hour: 22,
      memberId: memberA.id,
      status: "TENTATIVE",
    });
    await setAvailabilitySlot({
      date: "2030-06-05",
      hour: 22,
      memberId: memberB.id,
      status: "AVAILABLE",
    });
    await setAvailabilitySlot({
      date: "2030-06-05",
      hour: 23,
      memberId: memberA.id,
      status: "UNAVAILABLE",
    });

    // When
    const matches = await getPartyTimeMatches({
      dates: ["2030-06-05"],
      groupId: group.id,
      hours: [21, 22, 23],
      memberIds: [leader.id, memberA.id, memberB.id],
      now: new Date("2030-06-05T00:00:00.000Z"),
    });

    // Then
    expect(matches.map((match) => match.hour)).toEqual([21, 22, 23]);
    expect(matches[0]).toMatchObject({
      availableMembers: ["Leader", "Alpha", "Beta"],
      summaryLabel: "전원 가능",
      unavailableMembers: [],
    });
    expect(matches[1]).toMatchObject({
      summaryLabel: "1명 조율",
      tentativeMembers: ["Alpha"],
    });
    expect(matches[2]).toMatchObject({
      summaryLabel: "1명 불가",
      unavailableMembers: ["Alpha"],
    });
  });

  it("keeps missing availability separate from explicit unavailable", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "Missing Match",
      leaderNickname: "Leader",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "NoInput",
    });
    await setAvailabilitySlot({
      date: "2030-06-05",
      hour: 21,
      memberId: leader.id,
      status: "AVAILABLE",
    });

    // When
    const matches = await getPartyTimeMatches({
      dates: ["2030-06-05"],
      groupId: group.id,
      hours: [21],
      memberIds: [leader.id, member.id],
      now: new Date("2030-06-05T00:00:00.000Z"),
    });

    // Then
    expect(matches[0]).toMatchObject({
      availableMembers: ["Leader"],
      missingMembers: ["NoInput"],
      summaryLabel: "1명 미입력",
      unavailableMembers: [],
    });
  });

  it("reports confirmed schedule conflicts for assigned members within the same hour", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "Conflict Match",
      leaderNickname: "Leader",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Booked",
    });
    const character = await createCharacter({
      className: "Sorceress",
      itemLevel: 1640,
      memberId: member.id,
      name: "BookedChar",
      notes: "",
      preferredRole: "DPS",
    });
    const template = await createRaidTemplate({
      difficulty: "Hard",
      gates: "1",
      groupId: group.id,
      name: "Akkan",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "DPS 1",
          notes: "",
          required: true,
          role: "DPS",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      createdByMemberId: leader.id,
      groupId: group.id,
      startsAt: "2030-06-05T21:30:00+09:00",
      templateId: template.id,
      title: "Booked run",
    });
    const scheduleSlot = schedule.slots[0];
    expect(scheduleSlot).toBeDefined();
    if (!scheduleSlot) {
      throw new Error("Expected schedule slot fixture");
    }
    await assignScheduleSlot({
      characterId: character.id,
      memberId: member.id,
      slotId: scheduleSlot.id,
    });

    // When
    const matches = await getPartyTimeMatches({
      dates: ["2030-06-05"],
      groupId: group.id,
      hours: [21],
      memberIds: [leader.id, member.id],
      now: new Date("2030-06-05T00:00:00.000Z"),
    });

    // Then
    expect(matches[0]?.conflictedMembers).toEqual(["Booked"]);
    expect(matches[0]?.summaryLabel).toBe("1명 일정충돌");
  });
});
