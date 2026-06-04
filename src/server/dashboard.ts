import { db } from "@/server/db";
import { listUpcomingSchedules } from "@/server/schedules";

export async function getDashboardSummary(groupId: string, now = new Date()) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

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
            startsAt: { gte: todayStart },
            endsAt: { lte: todayEnd },
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
