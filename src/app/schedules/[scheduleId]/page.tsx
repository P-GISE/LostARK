import { revalidatePath } from "next/cache";
import { ScheduleAttendancePanel } from "@/components/schedule-attendance-panel";
import { SlotEditor } from "@/components/slot-editor";
import {
  Badge,
  EmptyState,
  PageHeader,
  SectionPanel,
  balancedPanelGridClassName,
  cx,
  dangerButtonClassName,
  inputClassName,
  pageShellClassName,
  primaryButtonClassName,
  textareaClassName,
} from "@/components/ui";
import { requireCurrentMember } from "@/server/auth-context";
import { listCharactersForMember } from "@/server/characters";
import { db } from "@/server/db";
import {
  assignScheduleSlot,
  cancelSchedule,
  listScheduleAttendances,
  setScheduleAttendance,
  unassignScheduleSlot,
  updateSchedule,
} from "@/server/schedules";

function parseAttendanceStatus(value: FormDataEntryValue | null) {
  if (value === "ACCEPTED" || value === "TENTATIVE" || value === "DECLINED") {
    return value;
  }
  throw new Error("참석 체크 상태가 올바르지 않습니다.");
}

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const member = await requireCurrentMember({
    loginRedirectPath: `/schedules/${scheduleId}`,
  });
  const [schedule, characters] = await Promise.all([
    db.schedule.findFirst({
      where: { id: scheduleId, groupId: member.groupId },
      include: {
        slots: { include: { assignedMember: true, assignedCharacter: true } },
        template: true,
      },
    }),
    listCharactersForMember(member.id),
  ]);

  async function assignSlot(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await assignScheduleSlot({
      slotId: String(formData.get("slotId") ?? ""),
      memberId: current.id,
      characterId: String(formData.get("characterId") ?? ""),
    });
    revalidatePath(`/schedules/${scheduleId}`);
  }

  async function editSchedule(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await updateSchedule({
      actorMemberId: current.id,
      scheduleId,
      title: String(formData.get("title") ?? ""),
      startsAt: String(formData.get("startsAt") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath(`/schedules/${scheduleId}`);
    revalidatePath("/schedules");
  }

  async function cancelCurrentSchedule() {
    "use server";
    const current = await requireCurrentMember();
    await cancelSchedule({
      actorMemberId: current.id,
      scheduleId,
    });
    revalidatePath(`/schedules/${scheduleId}`);
    revalidatePath("/schedules");
  }

  async function clearSlot(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await unassignScheduleSlot({
      actorMemberId: current.id,
      slotId: String(formData.get("slotId") ?? ""),
    });
    revalidatePath(`/schedules/${scheduleId}`);
  }

  async function checkAttendance(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await setScheduleAttendance({
      memberId: current.id,
      memo: String(formData.get("memo") ?? ""),
      scheduleId,
      status: parseAttendanceStatus(formData.get("status")),
    });
    revalidatePath(`/schedules/${scheduleId}`);
  }

  if (!schedule) {
    return (
      <main className={pageShellClassName}>
        <EmptyState title="일정을 찾을 수 없습니다." />
      </main>
    );
  }

  const attendances = await listScheduleAttendances(schedule.id);
  const assignedCount = schedule.slots.filter((slot) => slot.assignedMemberId).length;
  const scheduleNotes = schedule.notes.trim();
  const scheduleDateText = schedule.startsAt.toLocaleString("ko-KR");
  const scheduleStatusText =
    schedule.status === "CANCELED" ? "취소됨" : "진행 중";

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description={`${schedule.template.name} / ${scheduleDateText} / ${assignedCount}명 배정`}
        eyebrow="일정 상세"
        title={schedule.title}
      />
      <div className={cx("mt-5", balancedPanelGridClassName)}>
        <div className="grid content-start gap-4">
          <SectionPanel title="일정 정보">
            <div className="grid gap-4">
              <dl className="grid gap-2 text-sm">
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-slate-500">템플릿</dt>
                  <dd className="min-w-0 break-words font-medium text-slate-950">
                    {schedule.template.name}
                  </dd>
                </div>
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-slate-500">시간</dt>
                  <dd className="font-medium text-slate-950">{scheduleDateText}</dd>
                </div>
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-slate-500">배정</dt>
                  <dd className="font-medium text-slate-950">
                    {assignedCount} / {schedule.slots.length}명
                  </dd>
                </div>
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-slate-500">상태</dt>
                  <dd className="font-medium text-slate-950">{scheduleStatusText}</dd>
                </div>
              </dl>

              <div>
                <div className="text-xs font-semibold text-slate-500">메모</div>
                <div
                  className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-sm leading-6 text-slate-700"
                  data-testid="schedule-notes-summary"
                >
                  {scheduleNotes || "등록된 메모가 없습니다."}
                </div>
              </div>

              <details className="group border-t border-slate-100 pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                  <span>일정 수정</span>
                  <span className="text-xs font-medium text-slate-500 group-open:hidden">
                    열기
                  </span>
                  <span className="hidden text-xs font-medium text-slate-500 group-open:inline">
                    닫기
                  </span>
                </summary>
                <div className="mt-3 grid gap-3">
                  <form action={editSchedule} className="grid gap-3">
                    <label className="grid gap-1 text-xs font-semibold text-slate-500">
                      제목
                      <input
                        className={inputClassName}
                        defaultValue={schedule.title}
                        name="title"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-500">
                      시간
                      <input
                        className={inputClassName}
                        defaultValue={schedule.startsAt.toISOString()}
                        name="startsAt"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-500">
                      메모
                      <textarea
                        className={cx(textareaClassName, "max-h-40 overflow-y-auto")}
                        defaultValue={schedule.notes}
                        name="notes"
                        placeholder="메모"
                      />
                    </label>
                    <button className={primaryButtonClassName}>일정 저장</button>
                  </form>

                  {schedule.status !== "CANCELED" ? (
                    <form action={cancelCurrentSchedule}>
                      <button className={dangerButtonClassName}>일정 취소</button>
                    </form>
                  ) : (
                    <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      취소된 일정입니다.
                    </p>
                  )}
                </div>
              </details>
            </div>
          </SectionPanel>
        </div>
        <div>
          <ScheduleAttendancePanel
            action={checkAttendance}
            attendances={attendances.map((attendance) => ({
              memberId: attendance.memberId,
              memberNickname: attendance.member.nickname,
              memo: attendance.memo,
              status: attendance.status,
            }))}
            currentMemberId={member.id}
          />
          <SectionPanel
            action={
              <Badge tone={assignedCount === schedule.slots.length ? "success" : "info"}>
                {`${assignedCount} / ${schedule.slots.length}명 배정`}
              </Badge>
            }
            className="mt-5"
            title="자리 배정"
          >
            <div
              className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-100"
              data-testid="schedule-slot-list"
            >
              {schedule.slots.map((slot) => (
                <SlotEditor
                  action={assignSlot}
                  clearAction={clearSlot}
                  characters={characters}
                  key={slot.id}
                  slot={{
                    id: slot.id,
                    label: slot.label,
                    assignedMemberNickname: slot.assignedMember?.nickname ?? null,
                    assignedCharacterName: slot.assignedCharacter?.name ?? null,
                  }}
                />
              ))}
            </div>
          </SectionPanel>
        </div>
      </div>
    </main>
  );
}
