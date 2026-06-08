import {
  Badge,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

type AttendanceStatus = "ACCEPTED" | "DECLINED" | "PENDING" | "TENTATIVE";

type AttendanceSummary = {
  memberId: string;
  memberNickname: string;
  memo: string;
  status: AttendanceStatus;
};

const statusLabels: Record<AttendanceStatus, string> = {
  ACCEPTED: "참석",
  DECLINED: "불참",
  PENDING: "미체크",
  TENTATIVE: "조율",
};

function statusTone(status: AttendanceStatus) {
  if (status === "ACCEPTED") {
    return "success" as const;
  }
  if (status === "TENTATIVE") {
    return "warning" as const;
  }
  if (status === "DECLINED") {
    return "danger" as const;
  }
  return "neutral" as const;
}

function buttonClassName(status: Exclude<AttendanceStatus, "PENDING">) {
  if (status === "ACCEPTED") {
    return primaryButtonClassName;
  }
  if (status === "DECLINED") {
    return dangerButtonClassName;
  }
  return secondaryButtonClassName;
}

export function ScheduleAttendancePanel({
  action,
  attendances,
  currentMemberId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  attendances: AttendanceSummary[];
  currentMemberId: string;
}) {
  const currentAttendance = attendances.find(
    (attendance) => attendance.memberId === currentMemberId,
  );
  const currentStatus = currentAttendance?.status ?? "PENDING";

  return (
    <section className="mt-6 rounded-lg border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70">
      <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-950">일정 참석 체크</h2>
          <Badge tone={statusTone(currentStatus)}>
            내 상태: {statusLabels[currentStatus]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          참석 가능 여부와 간단한 메모를 남겨 공대장이 바로 확인할 수 있게 합니다.
        </p>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <form action={action} className="grid gap-3">
          <input
            className={inputClassName}
            defaultValue={currentAttendance?.memo ?? ""}
            name="memo"
            placeholder="메모 예: 10분 전 접속, 조금 늦을 수 있음"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            {(["ACCEPTED", "TENTATIVE", "DECLINED"] as const).map((status) => (
              <button
                className={buttonClassName(status)}
                key={status}
                name="status"
                value={status}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </form>

        {attendances.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
            아직 참석 체크한 공대원이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-md border border-slate-200/80 bg-white">
            {attendances.map((attendance) => (
              <div
                className="flex flex-col gap-2 px-3 py-3 first:pt-3 last:pb-3 sm:flex-row sm:items-center sm:justify-between"
                key={attendance.memberId}
              >
                <div>
                  <div className="font-medium text-slate-950">
                    {attendance.memberNickname}
                  </div>
                  {attendance.memo ? (
                    <div className="mt-1 text-sm text-slate-500">
                      {attendance.memo}
                    </div>
                  ) : null}
                </div>
                <Badge tone={statusTone(attendance.status)}>
                  {statusLabels[attendance.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
