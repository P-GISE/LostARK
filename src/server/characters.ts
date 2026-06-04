import { SlotRole } from "@prisma/client";
import { db } from "@/server/db";

export async function createCharacter(input: {
  memberId: string;
  name: string;
  className: string;
  itemLevel: number;
  preferredRole: keyof typeof SlotRole;
  notes: string;
}) {
  if (input.itemLevel <= 0) {
    throw new Error("Item level must be positive");
  }
  if (input.name.trim().length < 2) {
    throw new Error("Character name must be at least 2 characters");
  }

  return db.character.create({
    data: {
      memberId: input.memberId,
      name: input.name.trim(),
      className: input.className.trim(),
      itemLevel: input.itemLevel,
      preferredRole: input.preferredRole,
      notes: input.notes.trim(),
    },
  });
}

export async function listCharactersForMember(memberId: string) {
  return db.character.findMany({
    where: { memberId },
    orderBy: { createdAt: "asc" },
  });
}
