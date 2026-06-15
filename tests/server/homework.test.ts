import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { createGroupWithLeader } from "@/server/groups";
import { listHomeworkStatus, setHomeworkCompleted } from "@/server/homework";
import { createRaidTemplate } from "@/server/raid-templates";

describe("homework", () => {
  it("groups completed and incomplete raid checks by character", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "숙제 공대",
      leaderNickname: "리더",
    });
    const character = await createCharacter({
      className: "슬레이어",
      itemLevel: 1640,
      memberId: leader.id,
      name: "리더캐릭",
      notes: "",
      preferredRole: "DPS",
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
          label: "딜러 1",
          notes: "",
          required: true,
          role: "DPS",
        },
      ],
    });

    // When
    await setHomeworkCompleted({
      actorMemberId: leader.id,
      characterId: character.id,
      completed: true,
      raidTemplateId: template.id,
      weekStartDate: "2030-06-05",
    });
    const status = await listHomeworkStatus(group.id, "2030-06-05");
    const raid = status.members[0]?.characters[0]?.raids.find(
      (entry) => entry.raidTemplateId === template.id,
    );

    // Then
    expect(raid).toMatchObject({
      completed: true,
      raidTemplateName: "아칸",
    });
  });
});
