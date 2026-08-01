import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { buildDiscordRecruitmentMessage } from "@/server/discord-recruitment";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import { applyToRaidSignup, createRaidSignup } from "@/server/signups";

describe("discord recruitment payloads", () => {
  it("builds a stable Discord signup message with applicant controls", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "디스코드 모집 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "신청자",
    });
    const character = await createCharacter({
      className: "바드",
      itemLevel: 1660,
      memberId: member.id,
      name: "지원바드",
      notes: "",
      preferredRole: "SUPPORT",
    });
    const template = await createRaidTemplate({
      difficulty: "하드",
      gates: "1-2",
      groupId: group.id,
      name: "카제로스 1막",
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
      title: "1막 하드 수강",
      weekStartDate: "2030-06-05",
    });
    await applyToRaidSignup({
      characterId: character.id,
      memberId: member.id,
      signupId: signup.id,
    });

    const message = await buildDiscordRecruitmentMessage(signup.id);

    expect(message.embeds[0]?.title).toBe("1막 하드 수강");
    expect(message.embeds[0]?.description).toContain("카제로스 1막");
    expect(message.embeds[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "정원", value: "1/1명" }),
        expect.objectContaining({
          name: "신청자",
          value: expect.stringContaining("지원바드"),
        }),
      ]),
    );
    expect(message.components[0]?.components.map((button) => button.custom_id)).toEqual([
      `party:join:${signup.id}`,
      `party:leave:${signup.id}`,
      `party:close:${signup.id}`,
    ]);
    expect(message.components[1]?.components[0]?.custom_id).toBe(
      `party:day:${signup.id}:0`,
    );
  });
});
