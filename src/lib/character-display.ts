export type CharacterDisplayInput = {
  name: string;
  itemLevel: number;
  combatPower: number | null;
  isMain?: boolean;
};

export function compareCharacterDisplay(
  a: CharacterDisplayInput,
  b: CharacterDisplayInput,
) {
  if (Boolean(a.isMain) !== Boolean(b.isMain)) {
    return a.isMain ? -1 : 1;
  }

  const itemLevelComparison = b.itemLevel - a.itemLevel;
  if (itemLevelComparison !== 0) {
    return itemLevelComparison;
  }

  const aCombatPower = a.combatPower ?? -1;
  const bCombatPower = b.combatPower ?? -1;
  const combatPowerComparison = bCombatPower - aCombatPower;
  if (combatPowerComparison !== 0) {
    return combatPowerComparison;
  }

  return a.name.localeCompare(b.name, "ko");
}

export function sortCharactersForDisplay<T extends CharacterDisplayInput>(
  characters: readonly T[],
) {
  return [...characters].sort(compareCharacterDisplay);
}

export function formatItemLevel(itemLevel: number) {
  return Number.isInteger(itemLevel) ? String(itemLevel) : itemLevel.toFixed(2);
}

export function formatCombatPower(combatPower: number | null | undefined) {
  if (combatPower == null) {
    return "전투력 미확인";
  }
  return new Intl.NumberFormat("ko-KR").format(combatPower);
}
