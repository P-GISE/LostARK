import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import {
  assignRaidSetSlot,
  confirmRaidSetSchedule,
  createRaidSetFromTemplate,
  listRaidSetsForWeek,
  moveRaidSetSlot,
} from "@/server/raid-sets";

describe("raid sets", () => {
  it("creates draft set slots from a raid template", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "세트 생성 공대",
      leaderNickname: "리더",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "딜러 1",
          notes: "",
          required: true,
          role: "DPS",
        },
      ],
    });

    // When
    const raidSet = await createRaidSetFromTemplate({
      actorMemberId: leader.id,
      label: "아칸 1파티",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });

    // Then
    expect(raidSet.status).toBe("DRAFT");
    expect(raidSet.slots).toHaveLength(1);
    expect(raidSet.slots[0]?.label).toBe("딜러 1");
  });

  it("assigns and moves characters inside draft sets", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "세트 배정 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "서포터",
    });
    const character = await createCharacter({
      className: "바드",
      itemLevel: 1640,
      memberId: member.id,
      name: "서포터캐릭",
      notes: "",
      preferredRole: "SUPPORT",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "서폿 1",
          notes: "",
          required: true,
          role: "SUPPORT",
        },
      ],
    });
    const raidSet = await createRaidSetFromTemplate({
      actorMemberId: leader.id,
      label: "아칸 1파티",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });

    // When
    const assigned = await assignRaidSetSlot({
      actorMemberId: leader.id,
      characterId: character.id,
      memberId: member.id,
      slotId: raidSet.slots[0]?.id ?? "",
    });
    const moved = await moveRaidSetSlot({
      actorMemberId: leader.id,
      order: 2,
      slotId: assigned.id,
    });

    // Then
    expect(assigned.assignedCharacterId).toBe(character.id);
    expect(moved.order).toBe(2);
  });

  it("confirms a draft set into a schedule", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "세트 확정 공대",
      leaderNickname: "리더",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 1,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "딜러 1",
          notes: "",
          required: true,
          role: "DPS",
        },
      ],
    });
    const raidSet = await createRaidSetFromTemplate({
      actorMemberId: leader.id,
      label: "아칸 1파티",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });

    // When
    const schedule = await confirmRaidSetSchedule({
      actorMemberId: leader.id,
      raidSetId: raidSet.id,
      startsAt: "2030-06-05T21:00:00+09:00",
    });
    const sets = await listRaidSetsForWeek(group.id, "2030-06-05");

    // Then
    expect(schedule.title).toBe("아칸 1파티");
    expect(sets[0]?.status).toBe("CONFIRMED");
  });
});
