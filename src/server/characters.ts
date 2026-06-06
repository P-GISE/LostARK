import { SlotRole } from "@prisma/client";
import { sortCharactersForDisplay } from "@/lib/character-display";
import { db } from "@/server/db";

function validateItemLevel(itemLevel: number) {
  if (!Number.isFinite(itemLevel) || itemLevel <= 0) {
    throw new Error("아이템 레벨은 0보다 커야 합니다");
  }
}

function normalizeCombatPower(combatPower: number | null | undefined) {
  if (combatPower == null) {
    return null;
  }
  if (
    !Number.isFinite(combatPower) ||
    combatPower < 0 ||
    !Number.isInteger(combatPower)
  ) {
    throw new Error("전투력은 0 이상의 정수여야 합니다");
  }
  return combatPower;
}

export async function createCharacter(input: {
  memberId: string;
  name: string;
  className: string;
  itemLevel: number;
  preferredRole: keyof typeof SlotRole;
  notes: string;
  serverName?: string;
  combatPower?: number | null;
  isMain?: boolean;
  lastSyncedAt?: Date | null;
}) {
  validateItemLevel(input.itemLevel);
  if (input.name.trim().length < 2) {
    throw new Error("캐릭터명은 2자 이상이어야 합니다");
  }

  return db.character.create({
    data: {
      memberId: input.memberId,
      name: input.name.trim(),
      className: input.className.trim(),
      itemLevel: input.itemLevel,
      preferredRole: input.preferredRole,
      notes: input.notes.trim(),
      serverName: input.serverName?.trim() ?? "",
      combatPower: normalizeCombatPower(input.combatPower),
      isMain: input.isMain ?? false,
      lastSyncedAt: input.lastSyncedAt ?? null,
    },
  });
}

async function requireOwnedCharacter(input: {
  actorMemberId: string;
  characterId: string;
}) {
  const character = await db.character.findUnique({
    where: { id: input.characterId },
  });

  if (!character || character.memberId !== input.actorMemberId) {
    throw new Error("내 캐릭터만 변경할 수 있습니다");
  }

  return character;
}

export async function updateCharacter(input: {
  actorMemberId: string;
  characterId: string;
  name: string;
  className: string;
  itemLevel: number;
  preferredRole: keyof typeof SlotRole;
  notes: string;
  serverName?: string;
  combatPower?: number | null;
  isMain?: boolean;
  lastSyncedAt?: Date | null;
}) {
  await requireOwnedCharacter(input);

  validateItemLevel(input.itemLevel);
  if (input.name.trim().length < 2) {
    throw new Error("캐릭터명은 2자 이상이어야 합니다");
  }

  const data: {
    name: string;
    className: string;
    itemLevel: number;
    preferredRole: keyof typeof SlotRole;
    notes: string;
    serverName?: string;
    combatPower?: number | null;
    isMain?: boolean;
    lastSyncedAt?: Date | null;
  } = {
    name: input.name.trim(),
    className: input.className.trim(),
    itemLevel: input.itemLevel,
    preferredRole: input.preferredRole,
    notes: input.notes.trim(),
  };

  if ("serverName" in input) {
    data.serverName = input.serverName?.trim() ?? "";
  }
  if ("combatPower" in input) {
    data.combatPower = normalizeCombatPower(input.combatPower);
  }
  if ("isMain" in input) {
    data.isMain = input.isMain ?? false;
  }
  if ("lastSyncedAt" in input) {
    data.lastSyncedAt = input.lastSyncedAt ?? null;
  }

  return db.character.update({
    where: { id: input.characterId },
    data,
  });
}

export async function deleteCharacter(input: {
  actorMemberId: string;
  characterId: string;
}) {
  await requireOwnedCharacter(input);

  return db.character.delete({
    where: { id: input.characterId },
  });
}

export async function listCharactersForMember(memberId: string) {
  const characters = await db.character.findMany({
    where: { memberId },
    orderBy: { createdAt: "asc" },
  });

  return sortCharactersForDisplay(characters);
}
