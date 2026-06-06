import { StatusPill } from "@/components/status-pill";

export function ScheduleCard({
  title,
  startsAt,
  openSlots,
}: {
  title: string;
  startsAt: Date;
  openSlots: number;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {startsAt.toLocaleString("ko-KR")}
          </p>
        </div>
        <StatusPill label={`${openSlots}자리 비어 있음`} />
      </div>
    </article>
  );
}
