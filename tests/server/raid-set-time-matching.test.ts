import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setAvailabilitySlot } from "@/server/availability";
import { createCharacter } from "@/server/characters";
import { db } from "@/server/db";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import { assignRaidSetSlot } from "@/server/raid-set-slots";
import {
  confirmRaidSetSchedule,
  createRaidSetFromTemplate,
  getRaidSetTimeRecommendations,
} from "@/server/raid-sets";

async function createAssignedSetFixture(input: {
  readonly characterName: string;
  readonly groupName: string;
  readonly memberNickname: string;
  readonly raidSetLabel: string;
}) {
  const { group, leader } = await createGroupWithLeader({
    groupName: input.groupName,
    leaderNickname: "Leader",
  });
  const member = await joinGroupByInvite({
    inviteCode: group.inviteCode,
    nickname: input.memberNickname,
  });
  const character = await createCharacter({
    className: "Bard",
    itemLevel: 1640,
    memberId: member.id,
    name: input.characterName,
    notes: "",
    preferredRole: "SUPPORT",
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
        label: "Support 1",
        notes: "",
        required: true,
        role: "SUPPORT",
      },
    ],
  });
  const raidSet = await createRaidSetFromTemplate({
    actorMemberId: leader.id,
    label: input.raidSetLabel,
    templateId: template.id,
    weekStartDate: "2030-06-05",
  });
  const raidSetSlot = raidSet.slots[0];
  if (!raidSetSlot) throw new Error("Expected raid set slot fixture");
  await assignRaidSetSlot({
    actorMemberId: leader.id,
    characterId: character.id,
    slotId: raidSetSlot.id,
  });

  return { character, group, leader, member, raidSet, template };
}

describe("raid set time matching", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns time recommendations for assigned draft set members", async () => {
    // Given
    const { member, raidSet } = await createAssignedSetFixture({
      characterName: "AssignedBard",
      groupName: "Raid Set Recommend",
      memberNickname: "Assigned",
      raidSetLabel: "Akkan party 1",
    });
    await setAvailabilitySlot({
      date: "2030-06-05",
      hour: 21,
      memberId: member.id,
      status: "AVAILABLE",
    });

    // When
    const recommendations = await getRaidSetTimeRecommendations({
      dates: ["2030-06-05"],
      hours: [21],
      now: new Date("2030-06-05T00:00:00.000Z"),
      raidSetId: raidSet.id,
    });

    // Then
    expect(recommendations[0]).toMatchObject({
      availableMembers: ["Assigned"],
      date: "2030-06-05",
      hour: 21,
      missingMembers: [],
      recommended: true,
      totalMembers: 1,
    });
  });

  it("rejects confirming a set when an assigned member has a same-hour confirmed schedule", async () => {
    // Given
    const {
      character,
      leader,
      raidSet: bookedSet,
      template,
    } = await createAssignedSetFixture({
      characterName: "BookedBard",
      groupName: "Raid Set Conflict",
      memberNickname: "Booked",
      raidSetLabel: "Booked party",
    });
    const targetSet = await createRaidSetFromTemplate({
      actorMemberId: leader.id,
      label: "Target party",
      templateId: template.id,
      weekStartDate: "2030-06-05",
    });
    const targetSlot = targetSet.slots[0];
    if (!targetSlot) throw new Error("Expected raid set slot fixture");
    await assignRaidSetSlot({
      actorMemberId: leader.id,
      characterId: character.id,
      slotId: targetSlot.id,
    });
    await confirmRaidSetSchedule({
      actorMemberId: leader.id,
      raidSetId: bookedSet.id,
      startsAt: "2030-06-05T21:30:00+09:00",
    });

    // When
    const confirmation = confirmRaidSetSchedule({
      actorMemberId: leader.id,
      now: new Date("2030-06-05T11:59:00.000Z"),
      raidSetId: targetSet.id,
      startsAt: "2030-06-05T21:00:00+09:00",
    });

    // Then
    await expect(confirmation).rejects.toThrow(
      "이미 같은 시간에 확정된 일정이 있는 공대원이 있습니다",
    );
  });

  it("rejects confirming a set in the past when now is supplied", async () => {
    // Given
    const { leader, raidSet } = await createAssignedSetFixture({
      characterName: "PastBard",
      groupName: "Raid Set Past",
      memberNickname: "Past",
      raidSetLabel: "Past party",
    });

    // When
    const confirmation = confirmRaidSetSchedule({
      actorMemberId: leader.id,
      now: new Date("2030-06-05T12:00:01.000Z"),
      raidSetId: raidSet.id,
      startsAt: "2030-06-05T21:00:00+09:00",
    });

    // Then
    await expect(confirmation).rejects.toThrow(
      "지난 시간에는 일정을 생성할 수 없습니다",
    );
  });

  it("runs schedule confirmation in a serializable transaction", async () => {
    // Given
    const { leader, raidSet } = await createAssignedSetFixture({
      characterName: "SerializableBard",
      groupName: "Raid Set Serializable",
      memberNickname: "Serializable",
      raidSetLabel: "Serializable party",
    });
    const transactionSpy = vi.spyOn(db, "$transaction");

    // When
    await confirmRaidSetSchedule({
      actorMemberId: leader.id,
      raidSetId: raidSet.id,
      startsAt: "2030-06-05T21:00:00+09:00",
    });

    // Then
    expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });
});
