import { db } from "@/server/db";
import { kstSlotDate } from "@/server/availability";
import { buildLostArkWeekDays } from "@/lib/lostark-week";
import { listUpcomingSchedules } from "@/server/schedules";

export async function getDashboardSummary(groupId: string, now = new Date()) {
  const days = buildLostArkWeekDays(now);
  const weekStart = kstSlotDate(days[0].date, 0);
  const weekEnd = kstSlotDate(days[days.length - 1].date, 24);

  const [
    members,
    membersWithAvailability,
    upcomingSchedules,
    failedNotifications,
  ] = await Promise.all([
    db.member.findMany({ where: { groupId } }),
    db.member.findMany({
      where: {
        groupId,
        availabilityBlocks: {
          some: {
            startsAt: { gte: weekStart },
            endsAt: { lte: weekEnd },
          },
        },
      },
    }),
    listUpcomingSchedules(groupId, now),
    db.notificationJob.count({ where: { groupId, status: "FAILED" } }),
  ]);

  return {
    memberCount: members.length,
    missingAvailabilityCount: members.length - membersWithAvailability.length,
    upcomingSchedules,
    failedNotifications,
  };
}
