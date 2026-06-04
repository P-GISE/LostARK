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
    <article className="rounded border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        <StatusPill label={`${openSlots} open slots`} />
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        {startsAt.toLocaleString("ko-KR")}
      </p>
    </article>
  );
}
