import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { POST as applyBotSignup } from "@/app/api/bot/signups/[signupId]/apply/route";
import { POST as cancelBotSignup } from "@/app/api/bot/signups/[signupId]/cancel/route";
import { POST as closeBotSignup } from "@/app/api/bot/signups/[signupId]/close/route";
import { POST as recordBotSignupMessage } from "@/app/api/bot/signups/[signupId]/discord-message/route";
import { POST as setBotSignupAvailability } from "@/app/api/bot/signups/[signupId]/availability/route";
import { GET as listBotTemplates } from "@/app/api/bot/guilds/[discordGuildId]/templates/route";
import { POST as createBotSignup } from "@/app/api/bot/guilds/[discordGuildId]/signups/route";
import { createCharacter } from "@/server/characters";
import { db } from "@/server/db";
import { createGroupWithLeader } from "@/server/groups";
import { updateGroupOperationalSettings } from "@/server/group-settings";
import { connectDiscordMember, joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";

const BOT_AUTH_FIXTURE = "fixture-bot-auth";

function botRequest(path: string, body?: Record<string, unknown>) {
  return new Request(`https://lostark-party.test${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      authorization: `Bearer ${BOT_AUTH_FIXTURE}`,
      "content-type": "application/json",
    },
    method: body ? "POST" : "GET",
  });
}

async function createMappedGuildFixture(guildId: string) {
  const { group, leader } = await createGroupWithLeader({
    groupName: "사이트 봇 모집 공대",
    leaderNickname: "리더",
  });
  await connectDiscordMember({
    discordUserId: "discord-leader",
    memberId: leader.id,
  });
  await updateGroupOperationalSettings({
    actorMemberId: leader.id,
    availabilityChangeNoticeEnabled: false,
    dailyDiscordSummaryEnabled: false,
    dailyDiscordSummaryTime: "09:00",
    discordAnnouncementChannelId: "announcement-1",
    discordGuildId: guildId,
    discordRecruitmentChannelId: "recruitment-1",
    groupId: group.id,
    raidReminderLeadMinutes: 60,
    timetableEndHour: 4,
    timetableStartHour: 8,
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
        label: "딜러 1",
        notes: "",
        required: true,
        role: "DPS",
      },
    ],
  });

  return { group, leader, template };
}

describe("bot signup routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates site-backed signups for mapped guilds and lists templates", async () => {
    vi.stubEnv("LOSTARK_BOT_API_TOKEN", BOT_AUTH_FIXTURE);
    const guildId = `guild-${randomUUID()}`;
    const { template } = await createMappedGuildFixture(guildId);

    const templatesResponse = await listBotTemplates(
      botRequest(`/api/bot/guilds/${guildId}/templates`),
      { params: { discordGuildId: guildId } },
    );
    const createResponse = await createBotSignup(
      botRequest(`/api/bot/guilds/${guildId}/signups`, {
        discordUserId: "discord-leader",
        maxParties: 1,
        partySize: 1,
        templateId: template.id,
        title: "디스코드 1막 모집",
        weekStartDate: "2030-06-05",
      }),
      { params: { discordGuildId: guildId } },
    );
    const missingGuild = await createBotSignup(
      botRequest("/api/bot/guilds/missing/signups", {
        discordUserId: "discord-leader",
        maxParties: 1,
        partySize: 1,
        templateId: template.id,
        title: "실패 모집",
        weekStartDate: "2030-06-05",
      }),
      { params: { discordGuildId: "missing" } },
    );

    const templatesJson = (await templatesResponse.json()) as {
      templates: Array<{ id: string }>;
    };
    expect(templatesJson.templates.some((item) => item.id === template.id)).toBe(
      true,
    );
    const createdJson = (await createResponse.json()) as {
      message: { embeds: Array<{ title: string }> };
      signupId: string;
    };
    expect(createdJson.message.embeds[0]?.title).toBe("디스코드 1막 모집");
    expect(missingGuild.status).toBe(404);
  });

  it("blocks unlinked Discord users and mutates linked signup actions", async () => {
    vi.stubEnv("APP_BASE_URL", "https://lostark-party.test");
    vi.stubEnv("LOSTARK_BOT_API_TOKEN", BOT_AUTH_FIXTURE);
    const guildId = `guild-${randomUUID()}`;
    const { group, template } = await createMappedGuildFixture(guildId);
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "신청자",
    });
    await connectDiscordMember({
      discordUserId: "discord-member",
      memberId: member.id,
    });
    const character = await createCharacter({
      className: "소서리스",
      itemLevel: 1660,
      memberId: member.id,
      name: "신청소서",
      notes: "",
      preferredRole: "DPS",
    });
    const createResponse = await createBotSignup(
      botRequest(`/api/bot/guilds/${guildId}/signups`, {
        discordUserId: "discord-leader",
        maxParties: 1,
        partySize: 1,
        templateId: template.id,
        title: "연동 모집",
        weekStartDate: "2030-06-05",
      }),
      { params: { discordGuildId: guildId } },
    );
    const { signupId } = (await createResponse.json()) as { signupId: string };

    const unlinked = await applyBotSignup(
      botRequest(`/api/bot/signups/${signupId}/apply`, {
        discordUserId: "unknown-user",
      }),
      { params: { signupId } },
    );
    const applied = await applyBotSignup(
      botRequest(`/api/bot/signups/${signupId}/apply`, {
        characterId: character.id,
        discordUserId: "discord-member",
        memo: "20시 가능",
      }),
      { params: { signupId } },
    );
    const availability = await setBotSignupAvailability(
      botRequest(`/api/bot/signups/${signupId}/availability`, {
        dayIndex: 0,
        discordUserId: "discord-member",
        endHour: 22,
        startHour: 20,
      }),
      { params: { signupId } },
    );
    const recorded = await recordBotSignupMessage(
      botRequest(`/api/bot/signups/${signupId}/discord-message`, {
        discordChannelId: "recruitment-1",
        discordMessageId: "message-1",
      }),
      { params: { signupId } },
    );
    const canceled = await cancelBotSignup(
      botRequest(`/api/bot/signups/${signupId}/cancel`, {
        discordUserId: "discord-member",
      }),
      { params: { signupId } },
    );
    const closed = await closeBotSignup(
      botRequest(`/api/bot/signups/${signupId}/close`, {
        discordUserId: "discord-leader",
      }),
      { params: { signupId } },
    );

    expect(unlinked.status).toBe(403);
    await expect(unlinked.json()).resolves.toMatchObject({
      linkUrl: "https://lostark-party.test/notifications",
    });
    const appliedJson = (await applied.json()) as {
      message: { embeds: Array<{ fields: Array<{ name: string; value: string }> }> };
    };
    expect(
      appliedJson.message.embeds[0]?.fields.find((field) => field.name === "정원")
        ?.value,
    ).toBe("1/1명");
    await expect(availability.json()).resolves.toHaveProperty("message");
    await expect(recorded.json()).resolves.toMatchObject({
      discordChannelId: "recruitment-1",
      discordMessageId: "message-1",
      signupId,
    });
    const availabilityBlockCount = await db.availabilityBlock.count({
      where: { memberId: member.id },
    });
    const signup = await db.raidSignup.findUnique({ where: { id: signupId } });

    expect(availabilityBlockCount).toBe(2);
    await expect(canceled.json()).resolves.toHaveProperty("message");
    await expect(closed.json()).resolves.toHaveProperty("message");
    expect(signup?.discordMessageId).toBe("message-1");
  });
});
