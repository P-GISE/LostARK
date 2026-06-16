import type { AvailabilityStatus } from "@prisma/client";
import { isKstAvailabilitySlotInPast } from "@/lib/time-slots";
import { formatKstDate, formatKstSlotDateTime, kstSlotDate } from "@/server/availability";
import { db } from "@/server/db";

type AvailabilityState = AvailabilityStatus | "MISSING";

type MemberRef = {
  readonly id: string;
  readonly nickname: string;
};

export type PartyTimeMatch = {
  readonly date: string;
  readonly hour: number;
  readonly startsAt: string;
  readonly score: number;
  readonly summaryLabel: string;
  readonly availableMembers: readonly string[];
  readonly tentativeMembers: readonly string[];
  readonly unavailableMembers: readonly string[];
  readonly missingMembers: readonly string[];
  readonly conflictedMembers: readonly string[];
  readonly totalMembers: number;
  readonly recommended: boolean;
};

export type GetPartyTimeMatchesInput = {
  readonly dates: readonly string[];
  readonly excludeScheduleId?: string;
  readonly groupId: string;
  readonly hours: readonly number[];
  readonly limit?: number;
  readonly memberIds: readonly string[];
  readonly now?: Date;
};

function slotKey(date: string, hour: number): string {
  return `${date}:${hour}`;
}

function kstHour(date: Date): number {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  return kst.getUTCHours();
}

function flooredUtcHourTime(date: Date): number {
  const floored = new Date(date);
  floored.setUTCMinutes(0, 0, 0);

  return floored.getTime();
}

function summarizeSlot(input: {
  readonly available: number;
  readonly conflicted: number;
  readonly missing: number;
  readonly tentative: number;
  readonly total: number;
  readonly unavailable: number;
}): string {
  if (input.conflicted > 0) {
    return `${input.conflicted}명 일정충돌`;
  }
  if (input.unavailable > 0) {
    return `${input.unavailable}명 불가`;
  }
  if (input.missing > 0) {
    return `${input.missing}명 미입력`;
  }
  if (input.tentative > 0) {
    return `${input.tentative}명 조율`;
  }
  if (input.available === input.total && input.total > 0) {
    return "전원 가능";
  }

  return "추천 없음";
}

function scoreSlot(input: {
  readonly available: number;
  readonly conflicted: number;
  readonly missing: number;
  readonly tentative: number;
  readonly unavailable: number;
}): number {
  const positiveScore = input.available * 100 + input.tentative * 30;
  const penalty = input.missing * 10 + input.unavailable * 1000 + input.conflicted * 2000;

  return positiveScore - penalty;
}

function memberNamesByStatus(
  members: readonly MemberRef[],
  statuses: ReadonlyMap<string, AvailabilityState>,
  status: AvailabilityState,
): string[] {
  return members
    .filter((member) => statuses.get(member.id) === status)
    .map((member) => member.nickname);
}

function normalizeMembers(
  inputMemberIds: readonly string[],
  members: readonly MemberRef[],
): MemberRef[] {
  const memberById = new Map(members.map((member) => [member.id, member]));

  return Array.from(new Set(inputMemberIds)).flatMap((memberId) => {
    const member = memberById.get(memberId);

    return member ? [member] : [];
  });
}

function normalizeSlots(input: GetPartyTimeMatchesInput): {
  readonly dates: string[];
  readonly hours: number[];
} {
  const dates = Array.from(new Set(input.dates)).toSorted();
  const hours = Array.from(new Set(input.hours)).toSorted((a, b) => a - b);

  return { dates, hours };
}

export async function getPartyTimeMatches(
  input: GetPartyTimeMatchesInput,
): Promise<PartyTimeMatch[]> {
  const { dates, hours } = normalizeSlots(input);
  const firstDate = dates[0];
  const lastDate = dates.at(-1);

  if (!firstDate || !lastDate || hours.length === 0 || input.memberIds.length === 0) {
    return [];
  }

  const rawMembers = await db.member.findMany({
    where: { groupId: input.groupId, id: { in: Array.from(new Set(input.memberIds)) } },
    select: { id: true, nickname: true },
  });
  const members = normalizeMembers(input.memberIds, rawMembers);

  if (members.length === 0) {
    return [];
  }

  const minHour = Math.min(...hours);
  const maxHour = Math.max(...hours);
  const from = kstSlotDate(firstDate, minHour);
  const to = kstSlotDate(lastDate, maxHour + 1);
  const memberIds = members.map((member) => member.id);
  const statusBySlot = new Map<string, Map<string, AvailabilityState>>();
  const slotKeyByStart = new Map<number, string>();

  for (const date of dates) {
    for (const hour of hours) {
      const key = slotKey(date, hour);
      statusBySlot.set(key, new Map());
      slotKeyByStart.set(kstSlotDate(date, hour).getTime(), key);
    }
  }

  const blocks = await db.availabilityBlock.findMany({
    orderBy: [{ startsAt: "asc" }, { updatedAt: "asc" }],
    where: {
      endsAt: { gt: from },
      memberId: { in: memberIds },
      startsAt: { lt: to },
    },
  });

  for (const block of blocks) {
    const baseDate = formatKstDate(block.date);
    let cursor = new Date(block.startsAt);

    while (cursor < block.endsAt) {
      const cursorDate = formatKstDate(cursor);
      const hour = kstHour(cursor) + (cursorDate === baseDate ? 0 : 24);
      const responses = statusBySlot.get(slotKey(baseDate, hour));

      if (responses) {
        responses.set(block.memberId, block.status);
      }

      cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    }
  }

  const schedules = await db.schedule.findMany({
    select: {
      slots: { select: { assignedMemberId: true }, where: { assignedMemberId: { in: memberIds } } },
      startsAt: true,
    },
    where: {
      ...(input.excludeScheduleId ? { id: { not: input.excludeScheduleId } } : {}),
      groupId: input.groupId,
      slots: { some: { assignedMemberId: { in: memberIds } } },
      startsAt: { gte: from, lt: to },
      status: { not: "CANCELED" },
    },
  });
  const conflictsBySlot = new Map<string, Set<string>>();

  for (const schedule of schedules) {
    const key = slotKeyByStart.get(flooredUtcHourTime(schedule.startsAt));
    if (!key) {
      continue;
    }
    const conflictedMemberIds = conflictsBySlot.get(key) ?? new Set<string>();

    for (const slot of schedule.slots) {
      if (slot.assignedMemberId) {
        conflictedMemberIds.add(slot.assignedMemberId);
      }
    }

    conflictsBySlot.set(key, conflictedMemberIds);
  }

  const matches = dates.flatMap((date) =>
    hours
      .filter((hour) => !isKstAvailabilitySlotInPast(date, hour, input.now))
      .map((hour) => {
        const key = slotKey(date, hour);
        const rawStatuses = statusBySlot.get(key) ?? new Map<string, AvailabilityState>();
        const statuses = new Map<string, AvailabilityState>();

        for (const member of members) {
          statuses.set(member.id, rawStatuses.get(member.id) ?? "MISSING");
        }

        const conflictedIds = conflictsBySlot.get(key) ?? new Set<string>();
        const conflictedMembers = members
          .filter((member) => conflictedIds.has(member.id))
          .map((member) => member.nickname);
        const availableMembers = memberNamesByStatus(members, statuses, "AVAILABLE");
        const tentativeMembers = memberNamesByStatus(members, statuses, "TENTATIVE");
        const unavailableMembers = memberNamesByStatus(members, statuses, "UNAVAILABLE");
        const missingMembers = memberNamesByStatus(members, statuses, "MISSING");
        const score = scoreSlot({
          available: availableMembers.length,
          conflicted: conflictedMembers.length,
          missing: missingMembers.length,
          tentative: tentativeMembers.length,
          unavailable: unavailableMembers.length,
        });

        return {
          availableMembers,
          conflictedMembers,
          date,
          hour,
          missingMembers,
          recommended: conflictedMembers.length === 0 && unavailableMembers.length === 0,
          score,
          startsAt: formatKstSlotDateTime(date, hour),
          summaryLabel: summarizeSlot({
            available: availableMembers.length,
            conflicted: conflictedMembers.length,
            missing: missingMembers.length,
            tentative: tentativeMembers.length,
            total: members.length,
            unavailable: unavailableMembers.length,
          }),
          tentativeMembers,
          totalMembers: members.length,
          unavailableMembers,
        } satisfies PartyTimeMatch;
      }),
  );

  return matches
    .toSorted((a, b) => {
      const scoreDiff = b.score - a.score;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date);
    })
    .slice(0, input.limit ?? matches.length);
}
