import { db } from "@/server/db";

type AvailabilityPresetSlotInput = {
  readonly dayOfWeek?: number | null;
  readonly cycleDay?: number | null;
  readonly startTime: string;
  readonly endTime: string;
};

export class AvailabilityPresetError extends Error {
  readonly name = "AvailabilityPresetError";
}

function parseTime(value: string) {
  const trimmed = value.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new AvailabilityPresetError("시간은 HH:mm 형식이어야 합니다");
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new AvailabilityPresetError("시간 값이 올바르지 않습니다");
  }
  return trimmed;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function toKstDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+09:00`);
}

function dayOffset(slot: AvailabilityPresetSlotInput) {
  const offset = slot.dayOfWeek ?? slot.cycleDay ?? 0;
  if (!Number.isInteger(offset) || offset < 0 || offset > 27) {
    throw new AvailabilityPresetError("요일 또는 주기 일이 올바르지 않습니다");
  }
  return offset;
}

export async function createAvailabilityPreset(input: {
  readonly memberId: string;
  readonly name: string;
  readonly mode: "WEEKLY" | "CYCLE";
  readonly cycleDays?: number | null;
  readonly anchorDate?: string | null;
  readonly slots: readonly AvailabilityPresetSlotInput[];
}) {
  if (input.slots.length === 0) {
    throw new AvailabilityPresetError("프리셋에는 최소 한 시간이 필요합니다");
  }

  return db.availabilityPreset.create({
    data: {
      anchorDate: input.anchorDate?.trim() || null,
      cycleDays: input.cycleDays ?? null,
      memberId: input.memberId,
      mode: input.mode,
      name: input.name.trim(),
      slots: {
        create: input.slots.map((slot) => ({
          cycleDay: slot.cycleDay ?? null,
          dayOfWeek: slot.dayOfWeek ?? null,
          endTime: parseTime(slot.endTime),
          startTime: parseTime(slot.startTime),
        })),
      },
    },
    include: { slots: true },
  });
}

export async function listAvailabilityPresets(memberId: string) {
  return db.availabilityPreset.findMany({
    where: { memberId },
    include: { slots: { orderBy: { startTime: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function saveAvailabilityWeekOverride(input: {
  readonly memberId: string;
  readonly weekStartDate: string;
  readonly slots: readonly AvailabilityPresetSlotInput[];
}) {
  const weekEndDate = addDays(input.weekStartDate, 7);
  const weekStart = toKstDateTime(input.weekStartDate, "00:00");
  const weekEnd = toKstDateTime(weekEndDate, "00:00");

  return db.$transaction(async (tx) => {
    await tx.availabilityWeekOverride.upsert({
      where: {
        memberId_weekStartDate: {
          memberId: input.memberId,
          weekStartDate: input.weekStartDate,
        },
      },
      create: {
        memberId: input.memberId,
        weekStartDate: input.weekStartDate,
      },
      update: {},
    });
    await tx.availabilityBlock.deleteMany({
      where: {
        memberId: input.memberId,
        startsAt: { gte: weekStart },
        endsAt: { lte: weekEnd },
      },
    });

    return Promise.all(
      input.slots.map((slot) => {
        const date = addDays(input.weekStartDate, dayOffset(slot));
        return tx.availabilityBlock.create({
          data: {
            date: toKstDateTime(date, "00:00"),
            endsAt: toKstDateTime(date, parseTime(slot.endTime)),
            memberId: input.memberId,
            startsAt: toKstDateTime(date, parseTime(slot.startTime)),
            status: "AVAILABLE",
          },
        });
      }),
    );
  });
}
