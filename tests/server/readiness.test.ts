import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { db } from "@/server/db";
import { createGroupWithLeader } from "@/server/groups";
import { connectDiscordMember, joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import { buildSignupReadiness } from "@/server/readiness";
import { applyToRaidSignup, createRaidSignup } from "@/server/signups";

describe("signup readiness", () => {
  it("classifies ready, warning, and blocked applicants", async () => {
    const now = new Date("2030-06-06T00:00:00.000Z");
    const { group, leader } = await createGroupWithLeader({
      groupName: "준비도 공대",
      leaderNickname: "리더",
    });
    const readyMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "준비완료",
    });
    const warningMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "확인필요",
    });
    const blockedMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "기준미달",
    });
    await connectDiscordMember({
      discordUserId: "ready-discord",
      memberId: readyMember.id,
    });
    await connectDiscordMember({
      discordUserId: "blocked-discord",
      memberId: blockedMember.id,
    });
    const readyCharacter = await createCharacter({
      className: "블레이드",
      combatPower: 60000000,
      itemLevel: 1680,
      lastSyncedAt: new Date("2030-06-05T00:00:00.000Z"),
      memberId: readyMember.id,
      name: "준비블레",
      notes: "",
      preferredRole: "DPS",
    });
    const warningCharacter = await createCharacter({
      className: "기상술사",
      combatPower: null,
      itemLevel: 1680,
      lastSyncedAt: new Date("2030-05-20T00:00:00.000Z"),
      memberId: warningMember.id,
      name: "확인기상",
      notes: "",
      preferredRole: "OTHER",
    });
    const blockedCharacter = await createCharacter({
      className: "소서리스",
      combatPower: 40000000,
      itemLevel: 1640,
      lastSyncedAt: new Date("2030-06-05T00:00:00.000Z"),
      memberId: blockedMember.id,
      name: "미달소서",
      notes: "",
      preferredRole: "DPS",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1-2",
      groupId: group.id,
      name: "카제로스 1막",
      notes: "",
      requiredPlayers: 3,
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
      ],
    });
    await db.raidTemplate.update({
      data: {
        minimumCombatPower: 50000000,
        minimumItemLevel: 1660,
      },
      where: { id: template.id },
    });
    const signup = await createRaidSignup({
      actorMemberId: leader.id,
      maxParties: 1,
      partySize: 3,
      templateId: template.id,
      title: "준비도 모집",
      weekStartDate: "2030-06-05",
    });
    const readyEntry = await applyToRaidSignup({
      characterId: readyCharacter.id,
      memberId: readyMember.id,
      signupId: signup.id,
    });
    const warningEntry = await applyToRaidSignup({
      characterId: warningCharacter.id,
      memberId: warningMember.id,
      signupId: signup.id,
    });
    const blockedEntry = await applyToRaidSignup({
      characterId: blockedCharacter.id,
      memberId: blockedMember.id,
      signupId: signup.id,
    });

    const readiness = await buildSignupReadiness(signup.id, now);
    const byEntryId = new Map(readiness.map((entry) => [entry.entryId, entry]));

    expect(byEntryId.get(readyEntry.id)?.status).toBe("READY");
    expect(byEntryId.get(warningEntry.id)?.status).toBe("WARNING");
    expect(byEntryId.get(warningEntry.id)?.reasons).toEqual(
      expect.arrayContaining(["전투력 미확인", "디스코드 미연결"]),
    );
    expect(byEntryId.get(blockedEntry.id)?.status).toBe("BLOCKED");
    expect(byEntryId.get(blockedEntry.id)?.reasons.join(" ")).toContain(
      "아이템 레벨",
    );
  });
});
