import { AvailabilityStatus } from "@prisma/client";
import { db } from "@/server/db";

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
    throw new Error("Availability time is invalid");
  }
  if (endsAt <= startsAt) {
    throw new Error("Availability end must be after start");
  }

  const overlapping = await db.availabilityBlock.findFirst({
    where: {
      memberId: input.memberId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (overlapping && overlapping.status !== input.status) {
    throw new Error("Availability block conflicts with an existing block");
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
