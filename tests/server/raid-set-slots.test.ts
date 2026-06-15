import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import { createRaidSetFromTemplate } from "@/server/raid-sets";
import {
  assignRaidSetSlot,
  moveRaidSetSlot,
  unassignRaidSetSlot,
} from "@/server/raid-set-slots";

describe("raid set slots", () => {
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

  it("clears assigned characters from draft set slots", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "세트 배정 해제 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "딜러",
    });
    const character = await createCharacter({
      className: "슬레이어",
      itemLevel: 1640,
      memberId: member.id,
      name: "딜러캐릭",
      notes: "",
      preferredRole: "DPS",
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
    const assigned = await assignRaidSetSlot({
      actorMemberId: leader.id,
      characterId: character.id,
      memberId: member.id,
      slotId: raidSet.slots[0]?.id ?? "",
    });

    // When
    const cleared = await unassignRaidSetSlot({
      actorMemberId: leader.id,
      slotId: assigned.id,
    });

    // Then
    expect(cleared.assignedCharacterId).toBeNull();
    expect(cleared.assignedMemberId).toBeNull();
  });
});
