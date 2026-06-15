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
    expect(status.members[0]?.characters[0]).toMatchObject({
      className: "슬레이어",
      itemLevel: 1640,
    });
  });

  it("counts same-name raid difficulties as one homework item", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "난이도 묶음 공대",
      leaderNickname: "리더",
    });
    const character = await createCharacter({
      className: "브레이커",
      itemLevel: 1680,
      memberId: leader.id,
      name: "세르카캐릭",
      notes: "",
      preferredRole: "DPS",
    });
    await createRaidTemplate({
      difficulty: "노말",
      gates: "1",
      groupId: group.id,
      name: "세르카",
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
    const hardTemplate = await createRaidTemplate({
      difficulty: "하드",
      gates: "1",
      groupId: group.id,
      name: "세르카",
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
      raidTemplateId: hardTemplate.id,
      weekStartDate: "2030-06-05",
    });
    const status = await listHomeworkStatus(group.id, "2030-06-05");
    const raids = status.members[0]?.characters[0]?.raids ?? [];
    const uniqueRaidNames = new Set(raids.map((raid) => raid.raidTemplateName));

    // Then
    expect(status.members[0]).toMatchObject({
      completedCount: 1,
    });
    expect(status.members[0]?.totalCount).toBe(uniqueRaidNames.size);
    expect(raids.filter((raid) => raid.raidTemplateName === "세르카")).toHaveLength(2);
  });

  it("lists homework raids in the template priority order", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "숙제 우선순위 공대",
      leaderNickname: "리더",
    });
    await createCharacter({
      className: "블레이드",
      itemLevel: 1680,
      memberId: leader.id,
      name: "우선순위캐릭",
      notes: "",
      preferredRole: "DPS",
    });
    await createRaidTemplate({
      difficulty: "노말",
      gates: "1-2",
      groupId: group.id,
      name: "카제로스 서막: 붉어진 백야의 나선",
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
    await createRaidTemplate({
      difficulty: "노말",
      gates: "1-2",
      groupId: group.id,
      name: "카제로스 종막: 최후의 날",
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
    const status = await listHomeworkStatus(group.id, "2030-06-05");
    const raidNames =
      status.members[0]?.characters[0]?.raids.map(
        (raid) => raid.raidTemplateName,
      ) ?? [];
    const finaleIndex = raidNames.indexOf("카제로스 종막: 최후의 날");
    const preludeIndex = raidNames.indexOf("카제로스 서막: 붉어진 백야의 나선");

    // Then
    expect(finaleIndex).toBeGreaterThanOrEqual(0);
    expect(preludeIndex).toBeGreaterThanOrEqual(0);
    expect(finaleIndex).toBeLessThan(preludeIndex);
  });
});
