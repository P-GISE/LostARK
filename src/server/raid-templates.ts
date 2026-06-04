import { SlotRole } from "@prisma/client";
import { db } from "@/server/db";

export async function createRaidTemplate(input: {
  groupId: string;
  name: string;
  difficulty: string;
  gates: string;
  requiredPlayers: number;
  requirements: string;
  notes: string;
  slots: Array<{
    label: string;
    role: keyof typeof SlotRole;
    required: boolean;
    classPreference: string;
    notes: string;
  }>;
}) {
  if (input.requiredPlayers < 1) {
    throw new Error("Template must require at least one player");
  }
  if (input.slots.length === 0) {
    throw new Error("Template must include at least one slot");
  }

  return db.raidTemplate.create({
    data: {
      groupId: input.groupId,
      name: input.name.trim(),
      difficulty: input.difficulty.trim(),
      gates: input.gates.trim(),
      requiredPlayers: input.requiredPlayers,
      requirements: input.requirements.trim(),
      notes: input.notes.trim(),
      slots: {
        create: input.slots.map((slot) => ({
          label: slot.label.trim(),
          role: slot.role,
          required: slot.required,
          classPreference: slot.classPreference.trim() || null,
          notes: slot.notes.trim(),
        })),
      },
    },
    include: { slots: true },
  });
}

export async function listRaidTemplates(groupId: string) {
  return db.raidTemplate.findMany({
    where: { groupId },
    include: { slots: true },
    orderBy: { createdAt: "desc" },
  });
}
