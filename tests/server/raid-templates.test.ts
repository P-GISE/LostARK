import { describe, expect, it } from "vitest";
import { createGroup, createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import {
  createRaidTemplate,
  createRaidTemplateForLeader,
  deleteRaidTemplate,
  importDefaultRaidTemplatesForLeader,
  listRaidTemplates,
} from "@/server/raid-templates";
import { createScheduleFromTemplate } from "@/server/schedules";
import { db } from "@/server/db";

describe("raid templates", () => {
  it("creates a template with role slots and requirements", async () => {
    const group = await createGroup({ name: "Static" });

    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Thaemine Hard",
      difficulty: "Hard",
      gates: "1-3",
      requiredPlayers: 2,
      requirements: "Clear experience, gems checked",
      notes: "Bring dark grenades",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
        {
          label: "Support 1",
          role: "SUPPORT",
          required: true,
          classPreference: "Bard/Artist/Paladin",
          notes: "",
        },
      ],
    });

    expect(template.slots).toHaveLength(2);
    expect(template.requirements).toContain("Clear experience");
  });

  it("rejects templates whose slot count does not match required players", async () => {
    const group = await createGroup({ name: "Bad Template" });

    await expect(
      createRaidTemplate({
        groupId: group.id,
        name: "카멘",
        difficulty: "하드",
        gates: "1-4",
        requiredPlayers: 8,
        requirements: "",
        notes: "",
        slots: [
          {
            label: "딜러 1",
            role: "DPS",
            required: true,
            classPreference: "",
            notes: "",
          },
        ],
      }),
    ).rejects.toThrow("필요 인원과 자리 수가 일치해야 합니다");
  });

  it("allows leaders to create deploy-ready templates", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "공대",
      leaderNickname: "리더",
    });

    const template = await createRaidTemplateForLeader({
      actorMemberId: leader.id,
      groupId: group.id,
      name: "상아탑",
      difficulty: "하드",
      gates: "1-3",
      requiredPlayers: 1,
      requirements: "숙련도 확인",
      notes: "필수 준비",
      slots: [
        {
          label: "딜러 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    expect(template.name).toBe("상아탑");
    expect(template.slots).toHaveLength(1);
  });

  it("rejects non-leader template management", async () => {
    const { group } = await createGroupWithLeader({
      groupName: "공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "멤버",
    });

    await expect(
      createRaidTemplateForLeader({
        actorMemberId: member.id,
        groupId: group.id,
        name: "상아탑",
        difficulty: "하드",
        gates: "1-3",
        requiredPlayers: 1,
        requirements: "",
        notes: "",
        slots: [
          {
            label: "딜러 1",
            role: "DPS",
            required: true,
            classPreference: "",
            notes: "",
          },
        ],
      }),
    ).rejects.toThrow("공대장만 템플릿을 관리할 수 있습니다");
  });

  it("deletes templates inside the leader group", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "공대",
      leaderNickname: "리더",
    });
    const template = await createRaidTemplateForLeader({
      actorMemberId: leader.id,
      groupId: group.id,
      name: "상아탑",
      difficulty: "하드",
      gates: "1-3",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "딜러 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    await deleteRaidTemplate({
      actorMemberId: leader.id,
      templateId: template.id,
    });

    const templates = await listRaidTemplates(group.id);
    expect(templates.map((item) => item.id)).not.toContain(template.id);
  });

  it("imports Lost Ark default raid templates for legacy groups without duplicates", async () => {
    const group = await createGroup({ name: "기존 공대" });
    const leader = await db.member.create({
      data: {
        groupId: group.id,
        nickname: "리더",
        role: "LEADER",
      },
    });

    const imported = await importDefaultRaidTemplatesForLeader({
      actorMemberId: leader.id,
      groupId: group.id,
    });
    const templates = await listRaidTemplates(group.id);
    const templateKeys = templates.map(
      (template) => `${template.name} ${template.difficulty} ${template.gates}`,
    );

    expect(imported.createdCount).toBe(28);
    expect(imported.skippedCount).toBe(0);
    expect(imported.updatedCount).toBe(0);
    expect(templateKeys).toEqual(
      expect.arrayContaining([
        "지평의 성당 1단계 1-2",
        "지평의 성당 2단계 1-2",
        "지평의 성당 3단계 1-2",
        "그림자 레이드: 고통의 마녀 세르카 나이트메어 1-2",
        "카제로스 서막: 붉어진 백야의 나선 하드 1-2",
        "카제로스 1막: 대지를 부수는 업화의 궤적 하드 1-2",
        "카제로스 2막: 부유하는 악몽의 진혼곡 하드 1-2",
        "카제로스 2막: 아브렐슈드 익스트림 나이트메어 1",
        "카제로스 3막: 칠흑, 폭풍의 밤 하드 1-3",
        "카제로스 4막: 파멸의 성채 하드 1-2",
        "카제로스 종막: 최후의 날 하드 1-2",
        "베히모스 노말 1-2",
        "카멘 하드 1-4",
        "상아탑 하드 1-3",
        "카양겔 하드 1-3",
      ]),
    );
    expect(
      templates.find((template) => template.name === "베히모스")?.slots,
    ).toHaveLength(16);
    expect(
      templates.find((template) => template.name.includes("세르카"))?.slots,
    ).toHaveLength(4);

    const secondImport = await importDefaultRaidTemplatesForLeader({
      actorMemberId: leader.id,
      groupId: group.id,
    });
    const templatesAfterSecondImport = await listRaidTemplates(group.id);

    expect(secondImport.createdCount).toBe(0);
    expect(secondImport.updatedCount).toBe(0);
    expect(secondImport.skippedCount).toBe(imported.createdCount);
    expect(templatesAfterSecondImport).toHaveLength(templates.length);
  });

  it("updates exact legacy default templates instead of creating duplicates", async () => {
    const group = await createGroup({ name: "레거시 공대" });
    const leader = await db.member.create({
      data: {
        groupId: group.id,
        nickname: "리더",
        role: "LEADER",
      },
    });
    await createRaidTemplate({
      groupId: group.id,
      name: "카제로스 3막: 모르둠",
      difficulty: "하드",
      gates: "1-3",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "딜러 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    const result = await importDefaultRaidTemplatesForLeader({
      actorMemberId: leader.id,
      groupId: group.id,
    });
    const matchingTemplates = (await listRaidTemplates(group.id)).filter(
      (template) =>
        template.name === "카제로스 3막: 칠흑, 폭풍의 밤" &&
        template.difficulty === "하드" &&
        template.gates === "1-3",
    );

    expect(result.updatedCount).toBeGreaterThanOrEqual(1);
    expect(matchingTemplates).toHaveLength(1);
    expect(matchingTemplates[0].slots).toHaveLength(8);
  });

  it("trims surplus legacy template slots while preserving existing schedule slots", async () => {
    const group = await createGroup({ name: "레거시 슬롯 공대" });
    const leader = await db.member.create({
      data: {
        groupId: group.id,
        nickname: "리더",
        role: "LEADER",
      },
    });
    const legacyTemplate = await createRaidTemplate({
      groupId: group.id,
      name: "카제로스 3막: 모르둠",
      difficulty: "하드",
      gates: "1-3",
      requiredPlayers: 10,
      requirements: "",
      notes: "",
      slots: Array.from({ length: 10 }, (_, index) => ({
        label: `옛자리 ${index + 1}`,
        role: "DPS" as const,
        required: true,
        classPreference: "",
        notes: "",
      })),
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: legacyTemplate.id,
      title: "기존 일정",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    await importDefaultRaidTemplatesForLeader({
      actorMemberId: leader.id,
      groupId: group.id,
    });
    const updatedTemplate = (await listRaidTemplates(group.id)).find(
      (template) =>
        template.name === "카제로스 3막: 칠흑, 폭풍의 밤" &&
        template.difficulty === "하드" &&
        template.gates === "1-3",
    );

    expect(updatedTemplate?.slots).toHaveLength(8);
    await expect(
      db.scheduleSlot.count({ where: { scheduleId: schedule.id } }),
    ).resolves.toBe(10);
    await expect(
      db.scheduleSlot.count({
        where: {
          scheduleId: schedule.id,
          templateSlotId: { not: null },
        },
      }),
    ).resolves.toBe(8);
  });
});
