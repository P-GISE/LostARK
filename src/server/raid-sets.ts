import { Prisma } from "@prisma/client";
import { writeGroupActivityLog } from "@/server/activity-log";
import { isDateTimeInPast } from "@/lib/time-slots";
import { formatKstDate, kstSlotDate } from "@/server/availability";
import { RaidSetError, requireRaidSetManager } from "@/server/raid-set-access";
import { db } from "@/server/db";
import {
  requireCanConfirmSchedules,
  requireCanManageSets,
} from "@/server/group-permissions";
import { getPartyTimeMatches } from "@/server/party-time-matching";

export { RaidSetError } from "@/server/raid-set-access";
export {
  assignRaidSetSlot,
  markRaidSetSlotAbsent,
  moveRaidSetSlot,
  unassignRaidSetSlot,
} from "@/server/raid-set-slots";

function assignedMemberIds(
  slots: readonly { readonly assignedMemberId: string | null }[],
): readonly string[] {
  return Array.from(
    new Set(
      slots.flatMap((slot) =>
        slot.assignedMemberId ? [slot.assignedMemberId] : [],
      ),
    ),
  );
}

function kstHour(date: Date): number {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  return kst.getUTCHours();
}

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

export async function getRaidSetTimeRecommendations(input: {
  readonly raidSetId: string;
  readonly dates: readonly string[];
  readonly hours: readonly number[];
  readonly limit?: number;
  readonly now?: Date;
}) {
  const raidSet = await db.raidSet.findUnique({
    select: {
      groupId: true,
      slots: { select: { assignedMemberId: true } },
    },
    where: { id: input.raidSetId },
  });
  if (!raidSet) {
    return [];
  }

  const memberIds = assignedMemberIds(raidSet.slots);
  if (memberIds.length === 0) {
    return [];
  }

  return getPartyTimeMatches({
    dates: input.dates,
    groupId: raidSet.groupId,
    hours: input.hours,
    limit: input.limit,
    memberIds,
    now: input.now,
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
  readonly now?: Date;
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
  if (isDateTimeInPast(input.startsAt, input.now)) {
    throw new RaidSetError("지난 시간에는 일정을 생성할 수 없습니다");
  }

  const memberIds = assignedMemberIds(raidSet.slots);
  const scheduleDate = formatKstDate(startsAt);
  const scheduleHour = kstHour(startsAt);
  const scheduleHourStart = kstSlotDate(scheduleDate, scheduleHour);
  const scheduleHourEnd = kstSlotDate(scheduleDate, scheduleHour + 1);

  const schedule = await db.$transaction(
    async (tx) => {
      const conflict =
        memberIds.length > 0
          ? await tx.schedule.findFirst({
              select: { id: true },
              where: {
                groupId: raidSet.groupId,
                slots: { some: { assignedMemberId: { in: [...memberIds] } } },
                startsAt: { gte: scheduleHourStart, lt: scheduleHourEnd },
                status: { not: "CANCELED" },
              },
            })
          : null;

      if (conflict) {
        throw new RaidSetError("이미 같은 시간에 확정된 일정이 있는 공대원이 있습니다");
      }

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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

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
