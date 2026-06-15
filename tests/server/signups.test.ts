import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import {
  applyToRaidSignup,
  assignRaidSignup,
  createRaidSignup,
  finalizeRaidSignup,
  listRaidSignups,
} from "@/server/signups";

describe("signups", () => {
  it("creates signup entries and assigns full parties to draft sets", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "신청 공대",
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
      name: "바드하나",
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

    // When
    await applyToRaidSignup({
      characterId: character.id,
      memberId: member.id,
      signupId: signup.id,
    });
    await assignRaidSignup({ actorMemberId: leader.id, signupId: signup.id });
    const finalized = await finalizeRaidSignup({
      actorMemberId: leader.id,
      signupId: signup.id,
    });
    const signups = await listRaidSignups(group.id, "2030-06-05");

    // Then
    expect(finalized.status).toBe("FINALIZED");
    expect(signups[0]?.entries[0]?.status).toBe("ASSIGNED");
    expect(signups[0]?.assignments).toHaveLength(1);
  });
});
