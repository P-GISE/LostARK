import { WeeklyBoard } from "@/components/weekly-board/weekly-board";
import { PageHeader, pageShellClassName } from "@/components/ui";
import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import { requireCurrentMember } from "@/server/auth-context";
import { listRaidSetsForWeek } from "@/server/raid-sets";
import { listUpcomingSchedules } from "@/server/schedules";

export default async function WeeklyPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/weekly" });
  const weekStartDate = getLostArkWeekStartDate();
  const [schedules, raidSets] = await Promise.all([
    listUpcomingSchedules(member.groupId),
    listRaidSetsForWeek(member.groupId, weekStartDate),
  ]);

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="이번 주 확정 일정과 아직 시간 배정이 안 된 공대 편성을 함께 봅니다."
        eyebrow={weekStartDate}
        title="주간 일정"
      />
      <WeeklyBoard raidSets={raidSets} schedules={schedules} />
    </main>
  );
}
