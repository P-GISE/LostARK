import { describe, expect, it } from "vitest";
import {
  compareRaidTemplateDisplay,
  formatRaidTemplateGates,
  formatRaidTemplateLabel,
  splitRaidTemplateDifficulty,
} from "@/lib/raid-template-display";

describe("raid template display", () => {
  it("formats template labels with name, difficulty, and gates", () => {
    expect(
      formatRaidTemplateLabel({
        difficulty: "하드",
        gates: "1-4",
        name: "카멘",
      }),
    ).toBe("카멘 · 하드 · 1-4관문");
    expect(
      formatRaidTemplateLabel({
        difficulty: "익스트림 나이트메어",
        gates: "최종 관문",
        name: "카제로스 2막: 아브렐슈드",
      }),
    ).toBe("카제로스 2막: 아브렐슈드 · 익스트림 나이트메어 · 최종 관문");
  });

  it("keeps explicit gate text without adding duplicate wording", () => {
    expect(formatRaidTemplateGates("1-3")).toBe("1-3관문");
    expect(formatRaidTemplateGates("최종 관문")).toBe("최종 관문");
  });

  it("splits extreme mode from the actual difficulty", () => {
    expect(splitRaidTemplateDifficulty("익스트림 하드")).toEqual([
      "익스트림",
      "하드",
    ]);
    expect(splitRaidTemplateDifficulty("노말")).toEqual(["노말"]);
  });

  it("sorts the same raid by normal, hard, then nightmare", () => {
    const templates = [
      { difficulty: "익스트림 나이트메어", gates: "최종 관문", name: "카제로스" },
      { difficulty: "노말", gates: "1-2", name: "카제로스" },
      { difficulty: "하드", gates: "1-2", name: "카제로스" },
      { difficulty: "익스트림 노말", gates: "최종 관문", name: "카제로스" },
    ];

    expect(templates.sort(compareRaidTemplateDisplay).map((item) => item.difficulty)).toEqual([
      "노말",
      "하드",
      "익스트림 노말",
      "익스트림 나이트메어",
    ]);
  });
});
