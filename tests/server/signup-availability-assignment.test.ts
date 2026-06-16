import { describe, expect, it } from "vitest";
import { setAvailabilitySlot } from "@/server/availability";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import { listRaidSetsForWeek } from "@/server/raid-sets";
import {
  applyToRaidSignup,
  assignRaidSignup,
  createRaidSignup,
} from "@/server/signups";

async function createApplicant(input: {
  readonly className: string;
  readonly groupInviteCode: string;
  readonly name: string;
  readonly preferredRole: "DPS" | "SUPPORT";
}) {
  const member = await joinGroupByInvite({
    inviteCode: input.groupInviteCode,
    nickname: input.name,
  });
  const character = await createCharacter({
    className: input.className,
    itemLevel: 1640,
    memberId: member.id,
    name: `${input.name}Char`,
    notes: "",
    preferredRole: input.preferredRole,
  });

  return { character, member };
}

describe("signup availability assignment", () => {
  it("groups applicants by overlapping availability before signup order", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "Availability Signup",
      leaderNickname: "Leader",
    });
    const template = await createRaidTemplate({
      difficulty: "Hard",
      gates: "1",
      groupId: group.id,
      name: "Thaemine",
      notes: "",
      requiredPlayers: 2,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "DPS 1",
          notes: "",
          required: true,
          role: "DPS",
        },
        {
          classPreference: "",
          label: "Support 1",
          notes: "",
          required: true,
          role: "SUPPORT",
        },
      ],
    });
    const signup = await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 2,
      partySize: 2,
      templateId: template.id,
      title: "Thaemine signup",
      weekStartDate: "2030-06-05",
    });
    const alpha = await createApplicant({
      className: "Sorceress",
      groupInviteCode: group.inviteCode,
      name: "Alpha",
      preferredRole: "DPS",
    });
    const bravo = await createApplicant({
      className: "Slayer",
      groupInviteCode: group.inviteCode,
      name: "Bravo",
      preferredRole: "DPS",
    });
    const charlie = await createApplicant({
      className: "Bard",
      groupInviteCode: group.inviteCode,
      name: "Charlie",
      preferredRole: "SUPPORT",
    });
    const delta = await createApplicant({
      className: "Artist",
      groupInviteCode: group.inviteCode,
      name: "Delta",
      preferredRole: "SUPPORT",
    });

    for (const applicant of [alpha, charlie]) {
      await setAvailabilitySlot({
        date: "2030-06-05",
        hour: 21,
        memberId: applicant.member.id,
        status: "AVAILABLE",
      });
    }
    for (const applicant of [bravo, delta]) {
      await setAvailabilitySlot({
        date: "2030-06-05",
        hour: 23,
        memberId: applicant.member.id,
        status: "AVAILABLE",
      });
    }
    for (const applicant of [alpha, bravo, charlie, delta]) {
      await applyToRaidSignup({
        characterId: applicant.character.id,
        memberId: applicant.member.id,
        signupId: signup.id,
      });
    }

    // When
    await assignRaidSignup({ actorMemberId: leader.id, signupId: signup.id });
    const sets = await listRaidSetsForWeek(group.id, "2030-06-05");

    // Then
    expect(
      sets.map((set) =>
        set.slots.map((slot) => slot.assignedMember?.nickname ?? ""),
      ),
    ).toEqual([
      ["Alpha", "Charlie"],
      ["Bravo", "Delta"],
    ]);
  });
});
