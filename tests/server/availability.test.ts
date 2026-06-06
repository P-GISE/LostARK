import { describe, expect, it } from "vitest";
import {
  clearAvailabilitySlot,
  getGroupAvailabilityOverview,
  getRecommendedScheduleSlots,
  listAvailabilityForMember,
  saveAvailabilityBlock,
  setAvailabilitySlot,
} from "@/server/availability";
import { createGroup, createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";

describe("availability", () => {
  it("saves an availability block for a member", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "CalendarUser",
    });

    const block = await saveAvailabilityBlock({
      memberId: member.id,
      date: "2026-06-04",
      startsAt: "2026-06-04T20:00:00+09:00",
      endsAt: "2026-06-04T22:00:00+09:00",
      status: "AVAILABLE",
      memo: "After dinner",
    });

    expect(block.status).toBe("AVAILABLE");
  });

  it("rejects a block whose end is before start", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "BadTime",
    });

    await expect(
      saveAvailabilityBlock({
        memberId: member.id,
        date: "2026-06-04",
        startsAt: "2026-06-04T22:00:00+09:00",
        endsAt: "2026-06-04T20:00:00+09:00",
        status: "AVAILABLE",
        memo: "",
      }),
    ).rejects.toThrow("가능 시간은 시작보다 늦게 끝나야 합니다");
  });

  it("updates an existing hourly slot instead of creating duplicates", async () => {
    const group = await createGroup({ name: "Slot Update" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "SlotUser",
    });

    const first = await setAvailabilitySlot({
      memberId: member.id,
      date: "2026-06-04",
      hour: 20,
      status: "AVAILABLE",
    });
    const updated = await setAvailabilitySlot({
      memberId: member.id,
      date: "2026-06-04",
      hour: 20,
      status: "UNAVAILABLE",
    });

    expect(updated.id).toBe(first.id);
    expect(updated.status).toBe("UNAVAILABLE");
  });

  it("clears an existing hourly slot back to missing", async () => {
    const group = await createGroup({ name: "Slot Clear" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "ClearUser",
    });

    const slot = await setAvailabilitySlot({
      memberId: member.id,
      date: "2026-06-04",
      hour: 20,
      status: "AVAILABLE",
    });
    const result = await clearAvailabilitySlot({
      memberId: member.id,
      date: "2026-06-04",
      hour: 20,
    });

    const remaining = await listAvailabilityForMember(
      member.id,
      slot.startsAt,
      slot.endsAt,
    );

    expect(result.count).toBe(1);
    expect(remaining).toEqual([]);
  });

  it("stores late-night slots on the next calendar day", async () => {
    const group = await createGroup({ name: "Late Night" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "LateUser",
    });

    const block = await setAvailabilitySlot({
      memberId: member.id,
      date: "2026-06-04",
      hour: 25,
      status: "TENTATIVE",
    });

    expect(block.startsAt.toISOString()).toBe("2026-06-04T16:00:00.000Z");
    expect(block.endsAt.toISOString()).toBe("2026-06-04T17:00:00.000Z");
  });

  it("summarizes group availability by slot for leaders", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Summary Group",
      leaderNickname: "리더",
    });
    const memberA = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "알파",
    });
    await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "베타",
    });

    await setAvailabilitySlot({
      memberId: leader.id,
      date: "2026-06-04",
      hour: 20,
      status: "AVAILABLE",
    });
    await setAvailabilitySlot({
      memberId: memberA.id,
      date: "2026-06-04",
      hour: 20,
      status: "TENTATIVE",
    });

    const overview = await getGroupAvailabilityOverview({
      groupId: group.id,
      dates: ["2026-06-04"],
      hours: [20],
    });

    expect(overview).toEqual([
      {
        date: "2026-06-04",
        hour: 20,
        availableMembers: ["리더"],
        tentativeMembers: ["알파"],
        unavailableMembers: [],
        missingMembers: ["베타"],
      },
    ]);
  });

  it("recommends only slots where available members are a majority", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Recommendation Group",
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
    const memberC = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Gamma",
    });

    for (const member of [leader, memberA, memberB]) {
      await setAvailabilitySlot({
        memberId: member.id,
        date: "2026-06-04",
        hour: 20,
        status: "AVAILABLE",
      });
    }
    await setAvailabilitySlot({
      memberId: memberC.id,
      date: "2026-06-04",
      hour: 20,
      status: "UNAVAILABLE",
    });
    for (const member of [leader, memberA]) {
      await setAvailabilitySlot({
        memberId: member.id,
        date: "2026-06-04",
        hour: 21,
        status: "AVAILABLE",
      });
    }

    const recommendations = await getRecommendedScheduleSlots({
      dates: ["2026-06-04"],
      groupId: group.id,
      hours: [20, 21],
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      availableCount: 3,
      date: "2026-06-04",
      hour: 20,
      startsAt: "2026-06-04T20:00:00+09:00",
      totalMembers: 4,
    });
  });
});
