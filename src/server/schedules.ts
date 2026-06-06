import { ConfirmationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { queueScheduleNotificationJobs } from "@/server/notifications";

async function requireScheduleManager(input: {
  actorMemberId: string;
  scheduleId: string;
}) {
  const schedule = await db.schedule.findUnique({
    where: { id: input.scheduleId },
  });

  if (!schedule) {
    throw new Error("일정을 찾을 수 없습니다");
  }

  const actor = await db.member.findFirst({
    where: {
      id: input.actorMemberId,
      groupId: schedule.groupId,
    },
  });

  if (!actor || (actor.role !== "LEADER" && schedule.createdByMemberId !== actor.id)) {
    throw new Error("일정을 변경할 권한이 없습니다");
  }

  return schedule;
}

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
    throw new Error("공대에 없는 레이드 템플릿입니다");
  }
  const creator = await db.member.findFirst({
    where: {
      groupId: input.groupId,
      id: input.createdByMemberId,
      role: "LEADER",
    },
  });
  if (!creator) {
    throw new Error("공대장만 일정을 만들 수 있습니다");
  }

  const schedule = await db.schedule.create({
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

  await queueScheduleNotificationJobs({
    groupId: schedule.groupId,
    scheduleId: schedule.id,
    title: schedule.title,
    startsAt: schedule.startsAt,
  });

  return schedule;
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
    throw new Error("선택한 캐릭터가 해당 멤버의 캐릭터가 아닙니다");
  }

  const slot = await db.scheduleSlot.findUnique({
    where: { id: input.slotId },
    include: { schedule: true },
  });
  if (!slot) {
    throw new Error("일정 자리를 찾을 수 없습니다");
  }

  const member = await db.member.findFirst({
    where: {
      id: input.memberId,
      groupId: slot.schedule.groupId,
    },
  });
  if (!member) {
    throw new Error("일정이 속한 공대원만 자리를 배정할 수 있습니다");
  }
  if (slot.assignedMemberId && slot.assignedMemberId !== input.memberId) {
    throw new Error("이미 다른 공대원이 배정된 자리입니다");
  }

  const duplicate = await db.scheduleSlot.findFirst({
    where: {
      scheduleId: slot.scheduleId,
      assignedCharacterId: input.characterId,
      NOT: { id: input.slotId },
    },
  });
  if (duplicate) {
    throw new Error("이 일정에 이미 배정된 캐릭터입니다");
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

export async function updateSchedule(input: {
  actorMemberId: string;
  scheduleId: string;
  title: string;
  startsAt: string;
  notes: string;
}) {
  await requireScheduleManager(input);

  return db.schedule.update({
    where: { id: input.scheduleId },
    data: {
      title: input.title.trim(),
      startsAt: new Date(input.startsAt),
      notes: input.notes.trim(),
    },
  });
}

export async function cancelSchedule(input: {
  actorMemberId: string;
  scheduleId: string;
}) {
  await requireScheduleManager(input);

  return db.schedule.update({
    where: { id: input.scheduleId },
    data: { status: "CANCELED" },
  });
}

export async function unassignScheduleSlot(input: {
  actorMemberId: string;
  slotId: string;
}) {
  const slot = await db.scheduleSlot.findUnique({
    where: { id: input.slotId },
    include: { schedule: true },
  });

  if (!slot) {
    throw new Error("일정 자리를 찾을 수 없습니다");
  }

  const actor = await db.member.findFirst({
    where: {
      id: input.actorMemberId,
      groupId: slot.schedule.groupId,
    },
  });

  const canUnassign =
    actor &&
    (actor.role === "LEADER" ||
      slot.schedule.createdByMemberId === actor.id ||
      slot.assignedMemberId === actor.id);

  if (!canUnassign) {
    throw new Error("배정을 해제할 권한이 없습니다");
  }

  return db.scheduleSlot.update({
    where: { id: input.slotId },
    data: {
      assignedMemberId: null,
      assignedCharacterId: null,
      confirmationStatus: "PENDING",
    },
  });
}

export async function setScheduleAttendance(input: {
  memberId: string;
  memo: string;
  scheduleId: string;
  status: keyof typeof ConfirmationStatus;
}) {
  const schedule = await db.schedule.findUnique({
    where: { id: input.scheduleId },
  });

  if (!schedule) {
    throw new Error("일정을 찾을 수 없습니다");
  }

  const member = await db.member.findFirst({
    where: {
      id: input.memberId,
      groupId: schedule.groupId,
    },
  });

  if (!member) {
    throw new Error("일정이 속한 공대원만 참석 체크를 할 수 있습니다");
  }

  return db.scheduleAttendance.upsert({
    where: {
      scheduleId_memberId: {
        scheduleId: input.scheduleId,
        memberId: input.memberId,
      },
    },
    create: {
      scheduleId: input.scheduleId,
      memberId: input.memberId,
      status: input.status,
      memo: input.memo.trim(),
    },
    update: {
      status: input.status,
      memo: input.memo.trim(),
    },
    include: { member: true },
  });
}

export async function listScheduleAttendances(scheduleId: string) {
  return db.scheduleAttendance.findMany({
    where: { scheduleId },
    include: { member: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
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
