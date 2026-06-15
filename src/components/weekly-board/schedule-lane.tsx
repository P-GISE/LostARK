import { Badge } from "@/components/ui";

export type WeeklyScheduleView = {
  readonly id: string;
  readonly title: string;
  readonly startsAt: Date;
  readonly status: string;
  readonly template?: {
    readonly name: string;
    readonly difficulty: string;
    readonly gates: string;
  } | null;
};

function formatScheduleTime(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(value);
}

export function ScheduleLane({
  dateLabel,
  schedules,
}: {
  readonly dateLabel: string;
  readonly schedules: readonly WeeklyScheduleView[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-950">{dateLabel}</h2>
      <div className="mt-3 grid gap-2">
        {schedules.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            일정 없음
          </div>
        ) : (
          schedules.map((schedule) => (
            <article
              className="rounded-md border border-slate-100 bg-slate-50 p-3"
              key={schedule.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-950">
                  {schedule.title}
                </div>
                <Badge tone="success">{schedule.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {formatScheduleTime(schedule.startsAt)}
                {schedule.template ? (
                  <>
                    {" "}
                    · {schedule.template.name} · {schedule.template.difficulty}
                  </>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
