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

function formatKstTime(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(
    kst.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

function formatKstDate(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
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

export async function applyAvailabilityPresetToWeek(input: {
  readonly memberId: string;
  readonly presetId: string;
  readonly weekStartDate: string;
}) {
  const preset = await db.availabilityPreset.findFirst({
    include: { slots: true },
    where: { id: input.presetId, memberId: input.memberId },
  });
  if (!preset) {
    throw new AvailabilityPresetError("프리셋을 찾을 수 없습니다");
  }

  return saveAvailabilityWeekOverride({
    memberId: input.memberId,
    slots: preset.slots.map((slot) => ({
      cycleDay: slot.cycleDay,
      dayOfWeek: slot.dayOfWeek,
      endTime: slot.endTime,
      startTime: slot.startTime,
    })),
    weekStartDate: input.weekStartDate,
  });
}

export async function renameAvailabilityPreset(input: {
  readonly memberId: string;
  readonly presetId: string;
  readonly name: string;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new AvailabilityPresetError("프리셋 이름이 필요합니다");
  }

  const result = await db.availabilityPreset.updateMany({
    where: { id: input.presetId, memberId: input.memberId },
    data: { name },
  });
  if (result.count === 0) {
    throw new AvailabilityPresetError("프리셋을 찾을 수 없습니다");
  }

  return db.availabilityPreset.findUnique({
    include: { slots: true },
    where: { id: input.presetId },
  });
}

export async function deleteAvailabilityPreset(input: {
  readonly memberId: string;
  readonly presetId: string;
}) {
  const result = await db.availabilityPreset.deleteMany({
    where: { id: input.presetId, memberId: input.memberId },
  });
  if (result.count === 0) {
    throw new AvailabilityPresetError("프리셋을 찾을 수 없습니다");
  }

  return result;
}

export async function createAvailabilityPresetFromWeek(input: {
  readonly memberId: string;
  readonly name: string;
  readonly weekStartDate: string;
}) {
  const weekEndDate = addDays(input.weekStartDate, 7);
  const weekStart = toKstDateTime(input.weekStartDate, "00:00");
  const weekEnd = toKstDateTime(weekEndDate, "00:00");
  const blocks = await db.availabilityBlock.findMany({
    orderBy: [{ startsAt: "asc" }, { endsAt: "asc" }],
    where: {
      memberId: input.memberId,
      startsAt: { gte: weekStart },
      endsAt: { lte: weekEnd },
      status: "AVAILABLE",
    },
  });

  return createAvailabilityPreset({
    memberId: input.memberId,
    mode: "WEEKLY",
    name: input.name,
    slots: blocks.map((block) => ({
      dayOfWeek: Math.floor(
        (toKstDateTime(formatKstDate(block.date), "00:00").getTime() -
          weekStart.getTime()) /
          (24 * 60 * 60 * 1000),
      ),
      endTime: formatKstTime(block.endsAt),
      startTime: formatKstTime(block.startsAt),
    })),
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
