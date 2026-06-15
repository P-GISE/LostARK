import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import {
  confirmRaidSetSchedule,
  createRaidSetFromTemplate,
  deleteRaidSet,
  listRaidSetsForWeek,
} from "@/server/raid-sets";
import {
  applyToRaidSignup,
  assignRaidSignup,
  createRaidSignup,
  listRaidSignups,
} from "@/server/signups";

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

  it("deletes a draft set from the weekly set list", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "세트 삭제 공대",
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
      label: "삭제할 편성",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });

    // When
    await deleteRaidSet({ actorMemberId: leader.id, raidSetId: raidSet.id });
    const sets = await listRaidSetsForWeek(group.id, "2030-06-05");

    // Then
    expect(sets).toHaveLength(0);
  });

  it("returns signup entries to applied when deleting an assigned set", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "신청 편성 삭제 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "신청자",
    });
    const character = await createCharacter({
      className: "바드",
      itemLevel: 1640,
      memberId: member.id,
      name: "신청바드",
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
    const signup = await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 1,
      partySize: 1,
      templateId: template.id,
      title: "아칸 수강",
      weekStartDate: "2030-06-05",
    });
    await applyToRaidSignup({
      characterId: character.id,
      memberId: member.id,
      signupId: signup.id,
    });
    const assignedSetIds = await assignRaidSignup({
      actorMemberId: leader.id,
      signupId: signup.id,
    });

    // When
    await deleteRaidSet({
      actorMemberId: leader.id,
      raidSetId: assignedSetIds[0] ?? "",
    });
    const signups = await listRaidSignups(group.id, "2030-06-05");

    // Then
    expect(signups[0]?.status).toBe("OPEN");
    expect(signups[0]?.entries[0]?.status).toBe("APPLIED");
    expect(signups[0]?.assignments).toHaveLength(0);
  });
});
