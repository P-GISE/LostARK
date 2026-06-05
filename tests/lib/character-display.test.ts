import { describe, expect, it } from "vitest";
import {
  compareCharacterDisplay,
  formatCombatPower,
  formatItemLevel,
  sortCharactersForDisplay,
} from "@/lib/character-display";

describe("character display helpers", () => {
  const characters = [
    {
      name: "낮은본캐",
      itemLevel: 1700,
      combatPower: 5000,
      isMain: true,
    },
    {
      name: "강한부캐",
      itemLevel: 1750.33,
      combatPower: 7000,
      isMain: false,
    },
    {
      name: "동렙고전투력",
      itemLevel: 1720,
      combatPower: 6500,
      isMain: false,
    },
    {
      name: "동렙저전투력",
      itemLevel: 1720,
      combatPower: 6100,
      isMain: false,
    },
  ];

  it("sorts main first, then item level, combat power, and name", () => {
    expect(sortCharactersForDisplay(characters).map((item) => item.name)).toEqual([
      "낮은본캐",
      "강한부캐",
      "동렙고전투력",
      "동렙저전투력",
    ]);

    const nameTieCharacters = [
      {
        name: "다가나",
        itemLevel: 1720,
        combatPower: 6100,
        isMain: false,
      },
      {
        name: "가나다",
        itemLevel: 1720,
        combatPower: 6100,
        isMain: false,
      },
      {
        name: "나다가",
        itemLevel: 1720,
        combatPower: 6100,
        isMain: false,
      },
    ];

    expect(sortCharactersForDisplay(nameTieCharacters).map((item) => item.name)).toEqual([
      "가나다",
      "나다가",
      "다가나",
    ]);
  });

  it("formats item level and combat power for compact Korean UI", () => {
    expect(formatItemLevel(1773.33)).toBe("1773.33");
    expect(formatItemLevel(1700)).toBe("1700");
    expect(formatCombatPower(6127)).toBe("6,127");
    expect(formatCombatPower(null)).toBe("전투력 미확인");
    expect(formatCombatPower(undefined)).toBe("전투력 미확인");
  });

  it("can compare two display records directly", () => {
    expect(compareCharacterDisplay(characters[0], characters[1])).toBeLessThan(0);
  });
});
