import { describe, expect, it } from "vitest";
import { getRaidGroups } from "@/components/homework/homework-raid-groups";

describe("homework raid groups", () => {
  it("orders raid groups and variants by template priority", () => {
    // Given
    const raids = [
      {
        completed: false,
        difficulty: "하드",
        gates: "1-2",
        raidTemplateId: "prelude-hard",
        raidTemplateName: "카제로스 서막: 붉어진 백야의 나선",
      },
      {
        completed: false,
        difficulty: "하드",
        gates: "1-2",
        raidTemplateId: "finale-hard",
        raidTemplateName: "카제로스 종막: 최후의 날",
      },
      {
        completed: false,
        difficulty: "노말",
        gates: "1-2",
        raidTemplateId: "finale-normal",
        raidTemplateName: "카제로스 종막: 최후의 날",
      },
    ];

    // When
    const groups = getRaidGroups(raids);

    // Then
    expect(groups.map((group) => group.name)).toEqual([
      "카제로스 종막: 최후의 날",
      "카제로스 서막: 붉어진 백야의 나선",
    ]);
    expect(groups[0]?.raids.map((raid) => raid.difficulty)).toEqual([
      "노말",
      "하드",
    ]);
  });
});
