import { EmptyState, SectionPanel } from "@/components/ui";

type ActivityLogView = {
  readonly id: string;
  readonly actionType: string;
  readonly summary: string;
  readonly createdAt: Date;
  readonly actorMember: { readonly nickname: string } | null;
};

function formatLogDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(value);
}

export function ActivityLogSection({
  logs,
}: {
  readonly logs: readonly ActivityLogView[];
}) {
  return (
    <SectionPanel className="mt-6" title="활동 기록">
      {logs.length === 0 ? (
        <EmptyState title="아직 활동 기록이 없습니다." />
      ) : (
        <ol className="grid gap-3">
          {logs.map((log) => (
            <li
              className="rounded-md border border-slate-200 p-3 text-sm"
              key={log.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-950">
                  {log.summary}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {log.actionType}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {log.actorMember?.nickname ?? "시스템"} ·{" "}
                {formatLogDate(log.createdAt)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionPanel>
  );
}
