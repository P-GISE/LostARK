import { describe, expect, it } from "vitest";
import {
  listCharacterRaidChecksForGroup,
  setCharacterRaidCheck,
} from "@/server/character-raid-checks";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { createRaidTemplate } from "@/server/raid-templates";

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
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "카멘",
      difficulty: "하드",
      gates: "1-4",
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
});
