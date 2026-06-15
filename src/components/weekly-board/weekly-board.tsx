import {
  Badge,
  EmptyState,
  SectionPanel,
  balancedPanelGridClassName,
  cx,
  secondaryButtonClassName,
} from "@/components/ui";
import {
  ScheduleLane,
  type WeeklyScheduleView,
} from "@/components/weekly-board/schedule-lane";

type WeeklyRaidSetView = {
  readonly id: string;
  readonly label: string;
  readonly pinned: boolean;
  readonly status: string;
  readonly template: {
    readonly name: string;
    readonly difficulty: string;
    readonly gates: string;
  };
  readonly slots: readonly unknown[];
};

function formatDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(value);
}

function groupSchedulesByDate(schedules: readonly WeeklyScheduleView[]) {
  const grouped = new Map<string, WeeklyScheduleView[]>();

  for (const schedule of schedules) {
    const key = formatDateKey(schedule.startsAt);
    const group = grouped.get(key);
    if (group) {
      group.push(schedule);
    } else {
      grouped.set(key, [schedule]);
    }
  }

  return Array.from(grouped, ([dateLabel, dateSchedules]) => ({
    dateLabel,
    schedules: dateSchedules,
  }));
}

export function WeeklyBoard({
  raidSets,
  schedules,
}: {
  readonly raidSets: readonly WeeklyRaidSetView[];
  readonly schedules: readonly WeeklyScheduleView[];
}) {
  const scheduleGroups = groupSchedulesByDate(schedules);

  return (
    <div className={cx("mt-5", balancedPanelGridClassName)}>
      <div className="grid content-start gap-4">
        {scheduleGroups.length === 0 ? (
          <SectionPanel title="확정 일정">
            <EmptyState title="이번 주 확정 일정이 없습니다." />
          </SectionPanel>
        ) : (
          scheduleGroups.map((group) => (
            <ScheduleLane
              dateLabel={group.dateLabel}
              key={group.dateLabel}
              schedules={group.schedules}
            />
          ))
        )}
      </div>

      <SectionPanel
        action={
          <button
            className={secondaryButtonClassName}
            type="button"
          >
            이번 주 일정 복사
          </button>
        }
        title="미확정 세트"
      >
        {raidSets.length === 0 ? (
          <EmptyState title="대기 중인 draft 세트가 없습니다." />
        ) : (
          <div className="grid gap-3">
            {raidSets.map((raidSet) => (
              <article
                className="rounded-md border border-slate-200 bg-slate-50/70 p-3"
                key={raidSet.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">
                    {raidSet.label}
                  </span>
                  <Badge tone={raidSet.status === "CONFIRMED" ? "success" : "warning"}>
                    {raidSet.status}
                  </Badge>
                  {raidSet.pinned ? <Badge tone="info">고정</Badge> : null}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {raidSet.template.name} · {raidSet.template.difficulty} ·{" "}
                  {raidSet.slots.length}자리
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
