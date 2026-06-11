import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import { kstSlotDate } from "@/server/availability";
import { db } from "@/server/db";

export type DeleteStaleAvailabilityBlocksInput = {
  readonly groupId: string;
  readonly now?: Date;
};

export async function deleteStaleAvailabilityBlocksForGroup(
  input: DeleteStaleAvailabilityBlocksInput,
) {
  const weekStartDate = getLostArkWeekStartDate(input.now);
  const weekStart = kstSlotDate(weekStartDate, 0);

  return db.availabilityBlock.deleteMany({
    where: {
      endsAt: { lte: weekStart },
      member: { groupId: input.groupId },
    },
  });
}
