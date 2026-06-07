import { describe, expect, it } from "vitest";
import {
  listCharacterRaidChecksForGroup,
  setCharacterRaidCheck,
} from "@/server/character-raid-checks";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { createRaidTemplate } from "@/server/raid-templates";

async function createSingleSlotTemplate(input: {
  difficulty: string;
  gates: string;
  groupId: string;
  name: string;
}) {
  return createRaidTemplate({
    groupId: input.groupId,
    name: input.name,
    difficulty: input.difficulty,
    gates: input.gates,
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
}

describe("character raid checks", () => {
  it("sets, lists, and clears a weekly character raid check", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Checklist Group",
      leaderNickname: "Leader",
    });
    const character = await createCharacter({
      memberId: leader.id,
      name: "ChecklistChar",
      className: "Bard",
      itemLevel: 1700,
      preferredRole: "SUPPORT",
      notes: "",
    });
    const template = await createSingleSlotTemplate({
      groupId: group.id,
      name: "카멘",
      difficulty: "하드",
      gates: "1-4",
    });

    await setCharacterRaidCheck({
      actorMemberId: leader.id,
      characterId: character.id,
      completed: true,
      raidTemplateId: template.id,
      weekStartDate: "2030-06-05",
    });

    const checks = await listCharacterRaidChecksForGroup({
      groupId: group.id,
      weekStartDate: "2030-06-05",
    });

    expect(checks).toEqual([
      {
        characterId: character.id,
        raidTemplateId: template.id,
        weekStartDate: "2030-06-05",
      },
    ]);

    await setCharacterRaidCheck({
      actorMemberId: leader.id,
      characterId: character.id,
      completed: false,
      raidTemplateId: template.id,
      weekStartDate: "2030-06-05",
    });

    await expect(
      listCharacterRaidChecksForGroup({
        groupId: group.id,
        weekStartDate: "2030-06-05",
      }),
    ).resolves.toEqual([]);
  });

  it("replaces a same-name boss check when another difficulty is completed", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Boss Bucket Group",
      leaderNickname: "Leader",
    });
    const character = await createCharacter({
      memberId: leader.id,
      name: "BossBucketChar",
      className: "Bard",
      itemLevel: 1700,
      preferredRole: "SUPPORT",
      notes: "",
    });
    const serkaNormal = await createSingleSlotTemplate({
      groupId: group.id,
      name: "세르카",
      difficulty: "노말",
      gates: "1-2",
    });
    const serkaHard = await createSingleSlotTemplate({
      groupId: group.id,
      name: "세르카",
      difficulty: "하드",
      gates: "1-2",
    });
    const kamenHard = await createSingleSlotTemplate({
      groupId: group.id,
      name: "카멘",
      difficulty: "하드",
      gates: "1-4",
    });

    await setCharacterRaidCheck({
      actorMemberId: leader.id,
      characterId: character.id,
      completed: true,
      raidTemplateId: serkaNormal.id,
      weekStartDate: "2030-06-05",
    });
    await setCharacterRaidCheck({
      actorMemberId: leader.id,
      characterId: character.id,
      completed: true,
      raidTemplateId: kamenHard.id,
      weekStartDate: "2030-06-05",
    });
    await setCharacterRaidCheck({
      actorMemberId: leader.id,
      characterId: character.id,
      completed: true,
      raidTemplateId: serkaHard.id,
      weekStartDate: "2030-06-05",
    });

    const checks = await listCharacterRaidChecksForGroup({
      groupId: group.id,
      weekStartDate: "2030-06-05",
    });

    expect(checks).toHaveLength(2);
    expect(checks.map((check) => check.raidTemplateId).toSorted()).toEqual(
      [kamenHard.id, serkaHard.id].toSorted(),
    );
    expect(checks).not.toContainEqual(
      expect.objectContaining({ raidTemplateId: serkaNormal.id }),
    );
  });
});
