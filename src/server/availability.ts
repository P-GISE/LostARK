import { AvailabilityStatus } from "@prisma/client";
import { db } from "@/server/db";

export type GroupAvailabilitySlot = {
  date: string;
  hour: number;
  availableMembers: string[];
  tentativeMembers: string[];
  unavailableMembers: string[];
  missingMembers: string[];
};

export type RecommendedScheduleSlot = GroupAvailabilitySlot & {
  availableCount: number;
  missingCount: number;
  startsAt: string;
  tentativeCount: number;
  totalMembers: number;
};

function parseDateParts(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error("가능 시간 날짜 형식이 올바르지 않습니다");
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function kstSlotDate(date: string, hour: number) {
  const { year, month, day } = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, hour - 9));
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatKstSlotDateTime(date: string, hour: number) {
  const startsAt = kstSlotDate(date, hour);
  const kst = new Date(startsAt.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = pad2(kst.getUTCMonth() + 1);
  const day = pad2(kst.getUTCDate());
  const kstHour = pad2(kst.getUTCHours());

  return `${year}-${month}-${day}T${kstHour}:00:00+09:00`;
}

export function formatKstDate(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function kstHour(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours();
}

function kstDateStart(date: string) {
  return kstSlotDate(date, 0);
}

export async function saveAvailabilityBlock(input: {
  memberId: string;
  date: string;
  startsAt: string;
  endsAt: string;
  status: keyof typeof AvailabilityStatus;
  memo: string;
}) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("가능 시간 형식이 올바르지 않습니다");
  }
  if (endsAt <= startsAt) {
    throw new Error("가능 시간은 시작보다 늦게 끝나야 합니다");
  }

  const overlapping = await db.availabilityBlock.findFirst({
    where: {
      memberId: input.memberId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (overlapping && overlapping.status !== input.status) {
    throw new Error("기존 가능 시간과 겹칩니다");
  }

  return db.availabilityBlock.create({
    data: {
      memberId: input.memberId,
      date: new Date(`${input.date}T00:00:00+09:00`),
      startsAt,
      endsAt,
      status: input.status,
      memo: input.memo.trim() || null,
    },
  });
}

export async function setAvailabilitySlot(input: {
  memberId: string;
  date: string;
  hour: number;
  status: keyof typeof AvailabilityStatus;
}) {
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 47) {
    throw new Error("가능 시간 시간이 올바르지 않습니다");
  }

  const startsAt = kstSlotDate(input.date, input.hour);
  const endsAt = kstSlotDate(input.date, input.hour + 1);
  const date = kstDateStart(input.date);

  const existingSlot = await db.availabilityBlock.findFirst({
    where: {
      memberId: input.memberId,
      startsAt,
      endsAt,
    },
  });

  if (existingSlot) {
    return db.availabilityBlock.update({
      where: { id: existingSlot.id },
      data: {
        date,
        status: input.status,
        memo: null,
      },
    });
  }

  const overlapping = await db.availabilityBlock.findFirst({
    where: {
      memberId: input.memberId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (overlapping) {
    throw new Error("기존 가능 시간과 겹칩니다");
  }

  return db.availabilityBlock.create({
    data: {
      memberId: input.memberId,
      date,
      startsAt,
      endsAt,
      status: input.status,
      memo: null,
    },
  });
}

export async function clearAvailabilitySlot(input: {
  memberId: string;
  date: string;
  hour: number;
}) {
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 47) {
    throw new Error("가능 시간 시간이 올바르지 않습니다");
  }

  const startsAt = kstSlotDate(input.date, input.hour);
  const endsAt = kstSlotDate(input.date, input.hour + 1);

  return db.availabilityBlock.deleteMany({
    where: {
      memberId: input.memberId,
      startsAt,
      endsAt,
    },
  });
}

export async function listAvailabilityForGroup(groupId: string, from: Date, to: Date) {
  return db.availabilityBlock.findMany({
    where: {
      member: { groupId },
      startsAt: { gte: from },
      endsAt: { lte: to },
    },
    include: { member: true },
    orderBy: [{ startsAt: "asc" }, { member: { nickname: "asc" } }],
  });
}

export async function listAvailabilityForMember(memberId: string, from: Date, to: Date) {
  return db.availabilityBlock.findMany({
    where: {
      memberId,
      startsAt: { gte: from },
      endsAt: { lte: to },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getGroupAvailabilityOverview(input: {
  groupId: string;
  dates: string[];
  hours: number[];
}): Promise<GroupAvailabilitySlot[]> {
  const members = await db.member.findMany({
    where: { groupId: input.groupId },
    orderBy: { createdAt: "asc" },
  });

  if (input.dates.length === 0 || input.hours.length === 0) {
    return [];
  }

  const minHour = Math.min(...input.hours);
  const maxHour = Math.max(...input.hours);
  const from = kstSlotDate(input.dates[0], minHour);
  const to = kstSlotDate(input.dates[input.dates.length - 1], maxHour + 1);
  const slotResponses = new Map<string, Map<string, keyof typeof AvailabilityStatus>>();

  for (const date of input.dates) {
    for (const hour of input.hours) {
      slotResponses.set(`${date}:${hour}`, new Map());
    }
  }

  const blocks = await db.availabilityBlock.findMany({
    where: {
      member: { groupId: input.groupId },
      startsAt: { lt: to },
      endsAt: { gt: from },
    },
    orderBy: [{ startsAt: "asc" }, { updatedAt: "asc" }],
  });

  for (const block of blocks) {
    const baseDate = formatKstDate(block.date);
    let cursor = new Date(block.startsAt);

    while (cursor < block.endsAt) {
      const startsAtDate = formatKstDate(cursor);
      const hour = kstHour(cursor) + (startsAtDate === baseDate ? 0 : 24);
      const key = `${baseDate}:${hour}`;
      const responses = slotResponses.get(key);

      if (responses) {
        responses.set(block.memberId, block.status);
      }

      cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    }
  }

  return input.dates.flatMap((date) =>
    input.hours.map((hour) => {
      const responses = slotResponses.get(`${date}:${hour}`) ?? new Map();
      const availableMembers: string[] = [];
      const tentativeMembers: string[] = [];
      const unavailableMembers: string[] = [];
      const missingMembers: string[] = [];

      for (const member of members) {
        const status = responses.get(member.id);
        if (status === "AVAILABLE") {
          availableMembers.push(member.nickname);
        } else if (status === "TENTATIVE") {
          tentativeMembers.push(member.nickname);
        } else if (status === "UNAVAILABLE") {
          unavailableMembers.push(member.nickname);
        } else {
          missingMembers.push(member.nickname);
        }
      }

      return {
        date,
        hour,
        availableMembers,
        tentativeMembers,
        unavailableMembers,
        missingMembers,
      };
    }),
  );
}

export function recommendScheduleSlots(
  slots: GroupAvailabilitySlot[],
  limit = 8,
): RecommendedScheduleSlot[] {
  return slots
    .map((slot) => {
      const availableCount = slot.availableMembers.length;
      const tentativeCount = slot.tentativeMembers.length;
      const missingCount = slot.missingMembers.length;
      const totalMembers =
        availableCount +
        tentativeCount +
        slot.unavailableMembers.length +
        missingCount;

      return {
        ...slot,
        availableCount,
        missingCount,
        startsAt: formatKstSlotDateTime(slot.date, slot.hour),
        tentativeCount,
        totalMembers,
      };
    })
    .filter(
      (slot) => slot.totalMembers > 0 && slot.availableCount > slot.totalMembers / 2,
    )
    .toSorted((a, b) => {
      const availableDiff = b.availableCount - a.availableCount;
      if (availableDiff !== 0) return availableDiff;

      const tentativeDiff = b.tentativeCount - a.tentativeCount;
      if (tentativeDiff !== 0) return tentativeDiff;

      const missingDiff = a.missingCount - b.missingCount;
      if (missingDiff !== 0) return missingDiff;

      return a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date);
    })
    .slice(0, limit);
}

export async function getRecommendedScheduleSlots(input: {
  groupId: string;
  dates: string[];
  hours: number[];
  limit?: number;
}) {
  const overview = await getGroupAvailabilityOverview(input);
  return recommendScheduleSlots(overview, input.limit);
}
