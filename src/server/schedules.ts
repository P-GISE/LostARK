import { db } from "@/server/db";

export async function createScheduleFromTemplate(input: {
  groupId: string;
  templateId: string;
  title: string;
  startsAt: string;
  createdByMemberId: string;
}) {
  const template = await db.raidTemplate.findUnique({
    where: { id: input.templateId },
    include: { slots: true },
  });
  if (!template || template.groupId !== input.groupId) {
    throw new Error("Raid template not found in group");
  }

  return db.schedule.create({
    data: {
      groupId: input.groupId,
      templateId: input.templateId,
      title: input.title.trim(),
      startsAt: new Date(input.startsAt),
      createdByMemberId: input.createdByMemberId,
      slots: {
        create: template.slots.map((slot) => ({
          templateSlotId: slot.id,
          label: slot.label,
          role: slot.role,
          notes: slot.notes,
        })),
      },
    },
    include: { slots: true, template: true },
  });
}

export async function assignScheduleSlot(input: {
  slotId: string;
  memberId: string;
  characterId: string;
}) {
  const character = await db.character.findUnique({
    where: { id: input.characterId },
  });
  if (!character || character.memberId !== input.memberId) {
    throw new Error("Character does not belong to selected member");
  }

  const slot = await db.scheduleSlot.findUnique({
    where: { id: input.slotId },
  });
  if (!slot) {
    throw new Error("Schedule slot not found");
  }

  const duplicate = await db.scheduleSlot.findFirst({
    where: {
      scheduleId: slot.scheduleId,
      assignedCharacterId: input.characterId,
      NOT: { id: input.slotId },
    },
  });
  if (duplicate) {
    throw new Error("Character is already assigned to this schedule");
  }

  return db.scheduleSlot.update({
    where: { id: input.slotId },
    data: {
      assignedMemberId: input.memberId,
      assignedCharacterId: input.characterId,
      confirmationStatus: "ACCEPTED",
    },
  });
}

export async function listUpcomingSchedules(groupId: string, now = new Date()) {
  return db.schedule.findMany({
    where: {
      groupId,
      startsAt: { gte: now },
      status: { not: "CANCELED" },
    },
    include: {
      template: true,
      slots: { include: { assignedMember: true, assignedCharacter: true } },
    },
    orderBy: { startsAt: "asc" },
  });
}
