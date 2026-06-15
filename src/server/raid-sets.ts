import { writeGroupActivityLog } from "@/server/activity-log";
import { RaidSetError, requireRaidSetManager } from "@/server/raid-set-access";
import { db } from "@/server/db";
import {
  requireCanConfirmSchedules,
  requireCanManageSets,
} from "@/server/group-permissions";

export { RaidSetError } from "@/server/raid-set-access";
export {
  assignRaidSetSlot,
  markRaidSetSlotAbsent,
  moveRaidSetSlot,
  unassignRaidSetSlot,
} from "@/server/raid-set-slots";

export async function createRaidSetFromTemplate(input: {
  readonly actorMemberId: string;
  readonly templateId: string;
  readonly label: string;
  readonly weekStartDate: string;
}) {
  const actor = await requireCanManageSets(input.actorMemberId);
  const template = await db.raidTemplate.findUnique({
    where: { id: input.templateId },
    include: { slots: { orderBy: { id: "asc" } } },
  });

  if (!template || template.groupId !== actor.groupId) {
    throw new RaidSetError("공대에 없는 레이드 템플릿입니다");
  }

  const raidSet = await db.raidSet.create({
    data: {
      createdByMemberId: actor.id,
      groupId: actor.groupId,
      label: input.label.trim(),
      templateId: template.id,
      weekStartDate: input.weekStartDate,
      slots: {
        create: template.slots.map((slot, index) => ({
          label: slot.label,
          order: index + 1,
          role: slot.role,
        })),
      },
    },
    include: { slots: { orderBy: { order: "asc" } }, template: true },
  });

  await writeGroupActivityLog({
    actionType: "RAID_SET_CREATED",
    actorMemberId: actor.id,
    groupId: actor.groupId,
    summary: `${raidSet.label} 편성을 만들었습니다`,
    targetId: raidSet.id,
    targetType: "RaidSet",
  });

  return raidSet;
}

export async function listRaidSetsForWeek(
  groupId: string,
  weekStartDate: string,
) {
  return db.raidSet.findMany({
    where: { groupId, weekStartDate },
    include: {
      slots: {
        include: { assignedCharacter: true, assignedMember: true },
        orderBy: { order: "asc" },
      },
      template: true,
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "asc" }],
  });
}

export async function deleteRaidSet(input: { readonly actorMemberId: string; readonly raidSetId: string }) {
  const { raidSet } = await requireRaidSetManager(input);

  return db.$transaction(async (tx) => {
    await tx.raidSignup.updateMany({
      where: {
        assignments: { some: { raidSetId: raidSet.id } }, status: "ASSIGNING",
      },
      data: { status: "OPEN" },
    });
    await tx.raidSignupEntry.updateMany({
      where: { assignedRaidSetId: raidSet.id },
      data: { assignedRaidSetId: null, status: "APPLIED" },
    });

    return tx.raidSet.delete({ where: { id: raidSet.id } });
  });
}

export async function confirmRaidSetSchedule(input: {
  readonly actorMemberId: string;
  readonly raidSetId: string;
  readonly startsAt: string;
}) {
  const actor = await requireCanConfirmSchedules(input.actorMemberId);
  const raidSet = await db.raidSet.findUnique({
    where: { id: input.raidSetId },
    include: { slots: { orderBy: { order: "asc" } }, template: true },
  });
  const startsAt = new Date(input.startsAt);

  if (!raidSet) {
    throw new RaidSetError("공대 편성을 찾을 수 없습니다");
  }
  if (actor.groupId !== raidSet.groupId) {
    throw new RaidSetError("같은 공대의 편성만 확정할 수 있습니다");
  }
  if (Number.isNaN(startsAt.getTime())) {
    throw new RaidSetError("일정 시작 시간이 올바르지 않습니다");
  }

  const schedule = await db.$transaction(async (tx) => {
    const created = await tx.schedule.create({
      data: {
        createdByMemberId: actor.id,
        groupId: raidSet.groupId,
        startsAt,
        status: "CONFIRMED",
        templateId: raidSet.templateId,
        title: raidSet.label,
        slots: {
          create: raidSet.slots.map((slot) => ({
            assignedCharacterId: slot.assignedCharacterId,
            assignedMemberId: slot.assignedMemberId,
            confirmationStatus: slot.assignedMemberId ? "ACCEPTED" : "PENDING",
            label: slot.label,
            role: slot.roleOverride ?? slot.role,
          })),
        },
      },
      include: { slots: true, template: true },
    });

    await tx.raidSet.update({
      where: { id: raidSet.id },
      data: { scheduledStartsAt: startsAt, status: "CONFIRMED" },
    });

    return created;
  });

  await writeGroupActivityLog({
    actionType: "RAID_SET_CONFIRMED",
    actorMemberId: actor.id,
    groupId: raidSet.groupId,
    summary: `${raidSet.label} 편성을 일정으로 확정했습니다`,
    targetId: raidSet.id,
    targetType: "RaidSet",
  });

  return schedule;
}
