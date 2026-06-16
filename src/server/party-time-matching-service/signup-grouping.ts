import { availabilityHours } from "@/lib/availability-hours";
import { isKstAvailabilitySlotInPast } from "@/lib/time-slots";
import { formatKstDate, kstSlotDate } from "@/server/availability";
import { db } from "@/server/db";

export type SignupGroupingEntry = {
  readonly id: string;
  readonly memberId: string;
};

type SlotWeight = 1 | 2;

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function slotKey(date: string, hour: number): string {
  return `${date}:${hour}`;
}

function kstHour(date: Date): number {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  return kst.getUTCHours();
}

function statusWeight(status: string): SlotWeight | null {
  if (status === "AVAILABLE") {
    return 2;
  }
  if (status === "TENTATIVE") {
    return 1;
  }

  return null;
}

function groupCapacity(input: {
  readonly entryCount: number;
  readonly maxParties: number;
  readonly partySize: number;
}): number {
  return Math.min(
    Math.floor(input.entryCount / input.partySize),
    input.maxParties,
  );
}

function overlapScore(
  candidateSlots: ReadonlyMap<string, SlotWeight>,
  partySlots: readonly ReadonlyMap<string, SlotWeight>[],
): number {
  return partySlots.reduce((total, slots) => {
    let score = 0;

    for (const [key, candidateWeight] of candidateSlots) {
      const partyWeight = slots.get(key);
      if (partyWeight) {
        score += Math.min(candidateWeight, partyWeight);
      }
    }

    return total + score;
  }, 0);
}

function chooseNextEntryIndex<T extends SignupGroupingEntry>(input: {
  readonly memberSlots: ReadonlyMap<string, ReadonlyMap<string, SlotWeight>>;
  readonly party: readonly T[];
  readonly remaining: readonly T[];
}): number {
  const partyMemberIds = new Set(input.party.map((entry) => entry.memberId));
  const hasFreshMemberCandidate = input.remaining.some(
    (entry) => !partyMemberIds.has(entry.memberId),
  );
  const partySlots = input.party.map(
    (entry) => input.memberSlots.get(entry.memberId) ?? new Map(),
  );
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  input.remaining.forEach((entry, index) => {
    if (hasFreshMemberCandidate && partyMemberIds.has(entry.memberId)) {
      return;
    }

    const score = overlapScore(
      input.memberSlots.get(entry.memberId) ?? new Map(),
      partySlots,
    );

    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestIndex;
}

function makeParties<T extends SignupGroupingEntry>(input: {
  readonly entries: readonly T[];
  readonly maxParties: number;
  readonly memberSlots: ReadonlyMap<string, ReadonlyMap<string, SlotWeight>>;
  readonly partySize: number;
}): T[][] {
  const partyCount = groupCapacity({
    entryCount: input.entries.length,
    maxParties: input.maxParties,
    partySize: input.partySize,
  });
  const remaining = input.entries.slice(0, partyCount * input.partySize);
  const parties: T[][] = [];

  for (let partyIndex = 0; partyIndex < partyCount; partyIndex += 1) {
    const seed = remaining.shift();
    if (!seed) {
      break;
    }

    const party = [seed];
    while (party.length < input.partySize && remaining.length > 0) {
      const nextIndex = chooseNextEntryIndex({
        memberSlots: input.memberSlots,
        party,
        remaining,
      });
      const [nextEntry] = remaining.splice(nextIndex, 1);
      if (nextEntry) {
        party.push(nextEntry);
      }
    }

    parties.push(party);
  }

  return parties;
}

export async function groupEntriesByAvailability<T extends SignupGroupingEntry>(
  input: {
    readonly entries: readonly T[];
    readonly maxParties: number;
    readonly partySize: number;
    readonly weekStartDate: string;
    readonly now?: Date;
  },
): Promise<T[][]> {
  if (input.partySize < 1 || input.maxParties < 1 || input.entries.length === 0) {
    return [];
  }

  const dates = Array.from({ length: 7 }, (_, index) =>
    addDays(input.weekStartDate, index),
  );
  const from = kstSlotDate(
    dates[0] ?? input.weekStartDate,
    availabilityHours[0] ?? 0,
  );
  const to = kstSlotDate(
    dates.at(-1) ?? input.weekStartDate,
    (availabilityHours.at(-1) ?? 23) + 1,
  );
  const allowedKeys = new Set(
    dates.flatMap((date) =>
      availabilityHours
        .filter((hour) => !isKstAvailabilitySlotInPast(date, hour, input.now))
        .map((hour) => slotKey(date, hour)),
    ),
  );
  const memberIds = Array.from(
    new Set(input.entries.map((entry) => entry.memberId)),
  );
  const memberSlots = new Map<string, Map<string, SlotWeight>>(
    memberIds.map((memberId) => [memberId, new Map()]),
  );
  const blocks = await db.availabilityBlock.findMany({
    orderBy: [{ startsAt: "asc" }, { updatedAt: "asc" }],
    where: {
      endsAt: { gt: from },
      memberId: { in: memberIds },
      startsAt: { lt: to },
    },
  });

  for (const block of blocks) {
    const weight = statusWeight(block.status);
    const slots = memberSlots.get(block.memberId);
    if (!weight || !slots) {
      continue;
    }

    const baseDate = formatKstDate(block.date);
    let cursor = new Date(block.startsAt);

    while (cursor < block.endsAt) {
      const cursorDate = formatKstDate(cursor);
      const hour = kstHour(cursor) + (cursorDate === baseDate ? 0 : 24);
      const key = slotKey(baseDate, hour);

      if (allowedKeys.has(key)) {
        slots.set(key, Math.max(slots.get(key) ?? 0, weight) as SlotWeight);
      }

      cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
    }
  }

  return makeParties({
    entries: input.entries,
    maxParties: input.maxParties,
    memberSlots,
    partySize: input.partySize,
  });
}
