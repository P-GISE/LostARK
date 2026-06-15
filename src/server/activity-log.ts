import { db } from "@/server/db";

export async function writeGroupActivityLog(input: {
  readonly groupId: string;
  readonly actorMemberId?: string | null;
  readonly actionType: string;
  readonly targetType: string;
  readonly targetId?: string | null;
  readonly summary: string;
}) {
  return db.groupActivityLog.create({
    data: {
      actionType: input.actionType,
      actorMemberId: input.actorMemberId ?? null,
      groupId: input.groupId,
      summary: input.summary,
      targetId: input.targetId ?? null,
      targetType: input.targetType,
    },
  });
}

export async function listGroupActivityLogs(groupId: string, take = 30) {
  return db.groupActivityLog.findMany({
    where: { groupId },
    include: { actorMember: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}
