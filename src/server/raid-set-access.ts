import { db } from "@/server/db";
import { requireCanManageSets } from "@/server/group-permissions";

export class RaidSetError extends Error {
  readonly name = "RaidSetError";
}

export async function requireRaidSetManager(input: {
  readonly actorMemberId: string;
  readonly raidSetId: string;
}) {
  const actor = await requireCanManageSets(input.actorMemberId);
  const raidSet = await db.raidSet.findUnique({
    where: { id: input.raidSetId },
  });

  if (!raidSet) {
    throw new RaidSetError("공대 편성을 찾을 수 없습니다");
  }
  if (actor.groupId !== raidSet.groupId) {
    throw new RaidSetError("같은 공대의 편성만 변경할 수 있습니다");
  }

  return { actor, raidSet };
}
