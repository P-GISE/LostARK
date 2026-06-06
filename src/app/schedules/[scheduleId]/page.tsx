import { revalidatePath } from "next/cache";
import { ScheduleAttendancePanel } from "@/components/schedule-attendance-panel";
import { SlotEditor } from "@/components/slot-editor";
import {
  EmptyState,
  PageHeader,
  SectionPanel,
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
  const member = await requireCurrentMember();
  const { scheduleId } = await params;
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

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description={`${schedule.template.name} / ${schedule.startsAt.toLocaleString("ko-KR")} / ${assignedCount}명 배정`}
        eyebrow="일정 상세"
        title={schedule.title}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="grid content-start gap-4">
          <SectionPanel title="일정 정보">
            <form action={editSchedule} className="grid gap-3">
              <input
                className={inputClassName}
                defaultValue={schedule.title}
                name="title"
                required
              />
              <input
                className={inputClassName}
                defaultValue={schedule.startsAt.toISOString()}
                name="startsAt"
                required
              />
              <textarea
                className={textareaClassName}
                defaultValue={schedule.notes}
                name="notes"
                placeholder="메모"
              />
              <button className={primaryButtonClassName}>일정 저장</button>
            </form>
          </SectionPanel>
          {schedule.status !== "CANCELED" ? (
            <form action={cancelCurrentSchedule}>
              <button className={dangerButtonClassName}>일정 취소</button>
            </form>
          ) : (
            <p className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
              취소된 일정입니다.
            </p>
          )}
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
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-950">자리 배정</h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
          </section>
        </div>
      </div>
    </main>
  );
}
