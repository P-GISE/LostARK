import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import {
  applyToRaidSignup,
  assignRaidSignup,
  cancelRaidSignup,
  cancelRaidSignupEntry,
  createRaidSignup,
  finalizeRaidSignup,
  listRaidSignups,
  RaidSignupError,
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

  it("rejects assignment when there are not enough applicants", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "부족 신청 공대",
      leaderNickname: "리더",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 2,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "딜러 1",
          notes: "",
          required: true,
          role: "DPS",
        },
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
      partySize: 2,
      templateId: template.id,
      title: "아칸 수강",
      weekStartDate: "2030-06-05",
    });

    // When / Then
    await expect(
      assignRaidSignup({ actorMemberId: leader.id, signupId: signup.id }),
    ).rejects.toThrow(RaidSignupError);
  });

  it("rejects invalid party sizing when opening a signup", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "검증 신청 공대",
      leaderNickname: "리더",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "아칸",
      notes: "",
      requiredPlayers: 4,
      requirements: "",
      slots: [
        {
          classPreference: "",
          label: "딜러 1",
          notes: "",
          required: true,
          role: "DPS",
        },
        {
          classPreference: "",
          label: "딜러 2",
          notes: "",
          required: true,
          role: "DPS",
        },
        {
          classPreference: "",
          label: "딜러 3",
          notes: "",
          required: true,
          role: "DPS",
        },
        {
          classPreference: "",
          label: "서폿 1",
          notes: "",
          required: true,
          role: "SUPPORT",
        },
      ],
    });
    const baseInput = {
      actorMemberId: leader.id,
      templateId: template.id,
      title: "검증 신청",
      weekStartDate: "2030-06-05",
    };

    // When / Then
    await expect(
      createRaidSignup({
        ...baseInput,
        maxParties: 1,
        partySize: 1.5,
      }),
    ).rejects.toThrow(RaidSignupError);
    await expect(
      createRaidSignup({
        ...baseInput,
        maxParties: Number.NaN,
        partySize: 1,
      }),
    ).rejects.toThrow(RaidSignupError);
    await expect(
      createRaidSignup({
        ...baseInput,
        maxParties: 1,
        partySize: 0,
      }),
    ).rejects.toThrow(RaidSignupError);
    await expect(
      createRaidSignup({
        ...baseInput,
        maxParties: 1,
        partySize: 5,
      }),
    ).rejects.toThrow("파티 인원은 레이드 정원보다 클 수 없습니다");
  });

  it("hides canceled signup cards and canceled entries from the active list", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "취소 신청 공대",
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
      name: "취소바드",
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
    const canceledSignup = await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 1,
      partySize: 1,
      templateId: template.id,
      title: "취소될 신청",
      weekStartDate: "2030-06-05",
    });
    const activeSignup = await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 1,
      partySize: 1,
      templateId: template.id,
      title: "남는 신청",
      weekStartDate: "2030-06-05",
    });
    const entry = await applyToRaidSignup({
      characterId: character.id,
      memberId: member.id,
      signupId: activeSignup.id,
    });

    // When
    await cancelRaidSignup({
      actorMemberId: leader.id,
      signupId: canceledSignup.id,
    });
    await cancelRaidSignupEntry({ entryId: entry.id, memberId: member.id });
    const signups = await listRaidSignups(group.id, "2030-06-05");

    // Then
    expect(signups.map((signup) => signup.title)).toEqual(["남는 신청"]);
    expect(signups[0]?.entries).toHaveLength(0);
  });
});
