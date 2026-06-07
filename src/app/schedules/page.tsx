import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  EmptyState,
  PageHeader,
  SectionPanel,
  inputClassName,
  pageShellClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  selectClassName,
} from "@/components/ui";
import { availabilityHours } from "@/lib/availability-hours";
import { buildLostArkWeekDays } from "@/lib/lostark-week";
import {
  compareRaidTemplateDisplay,
  formatRaidTemplateLabel,
} from "@/lib/raid-template-display";
import { isDateTimeInPast } from "@/lib/time-slots";
import {
  getRecommendedScheduleSlots,
  type RecommendedScheduleSlot,
} from "@/server/availability";
import { requireCurrentMember } from "@/server/auth-context";
import { listRaidTemplates } from "@/server/raid-templates";
import {
  createScheduleFromTemplate,
  listUpcomingSchedules,
} from "@/server/schedules";

function formatStartsAt(startsAt: string) {
  if (!startsAt) {
    return null;
  }

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function TemplateSelect({
  templates,
}: {
  templates: Awaited<ReturnType<typeof listRaidTemplates>>;
}) {
  return (
    <select name="templateId" required className={selectClassName}>
      <option value="">템플릿 선택</option>
      {templates.map((template) => (
        <option key={template.id} value={template.id}>
          {formatRaidTemplateLabel(template)}
        </option>
      ))}
    </select>
  );
}

function RecommendationCard({
  checked,
  slot,
}: {
  checked: boolean;
  slot: RecommendedScheduleSlot;
}) {
  return (
    <label className="grid cursor-pointer gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50">
      <input
        className="h-4 w-4 accent-cyan-700"
        defaultChecked={checked}
        name="startsAt"
        required
        type="radio"
        value={slot.startsAt}
      />
      <span className="font-semibold text-slate-950">
        {formatStartsAt(slot.startsAt)}
      </span>
      <span className="text-xs font-semibold text-emerald-700">
        {slot.availableCount}/{slot.totalMembers} 가능
      </span>
      <span className="truncate text-xs text-slate-500">
        {slot.availableMembers.join(", ")}
      </span>
    </label>
  );
}

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; startsAt?: string }>;
}) {
  const member = await requireCurrentMember();
  const params = await searchParams;
  const now = new Date();
  const defaultStartsAt = params?.startsAt ?? "";
  const selectedFromAvailability =
    params?.from === "availability" &&
    defaultStartsAt.length > 0 &&
    !isDateTimeInPast(defaultStartsAt, now);
  const selectedStartsAtLabel = selectedFromAvailability
    ? formatStartsAt(defaultStartsAt)
    : null;
  const schedules = await listUpcomingSchedules(member.groupId, now);
  const templates = (await listRaidTemplates(member.groupId)).sort(
    compareRaidTemplateDisplay,
  );
  const days = buildLostArkWeekDays();
  const recommendations =
    member.role === "LEADER"
      ? await getRecommendedScheduleSlots({
          dates: days.map((day) => day.date),
          groupId: member.groupId,
          hours: availabilityHours,
          limit: 8,
          now,
        })
      : [];

  async function createSchedule(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await createScheduleFromTemplate({
      groupId: current.groupId,
      templateId: String(formData.get("templateId")),
      title: String(formData.get("title")),
      startsAt: String(formData.get("startsAt")),
      createdByMemberId: current.id,
    });
    revalidatePath("/schedules");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="레이드 템플릿을 기준으로 일정을 만들고 공대원 배정 상태를 확인합니다."
        eyebrow="레이드 운영"
        title="일정"
      />
      {templates.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            action={<Link className={primaryButtonClassName} href="/templates">템플릿 추가</Link>}
            description="일정을 만들려면 먼저 사용할 레이드 템플릿이 필요합니다."
            title="먼저 레이드 템플릿을 추가해 주세요."
          />
        </div>
      ) : member.role === "LEADER" && selectedStartsAtLabel ? (
        <SectionPanel
          className="mt-6"
          description={`가능 시간에서 선택한 ${selectedStartsAtLabel} 기준입니다. 템플릿을 고르면 해당 시간으로 일정이 생성됩니다.`}
          title="선택한 가능 시간으로 일정 생성"
        >
          <form action={createSchedule} className="grid gap-3 lg:grid-cols-[1fr_14rem_1fr_auto]">
            <input
              name="title"
              required
              className={inputClassName}
              placeholder="일정 제목"
            />
            <input
              name="startsAt"
              required
              className={inputClassName}
              defaultValue={defaultStartsAt}
              placeholder="2030-06-05T21:00:00+09:00"
            />
            <TemplateSelect templates={templates} />
            <button className={primaryButtonClassName}>
              선택 시간으로 일정 생성
            </button>
          </form>
        </SectionPanel>
      ) : member.role === "LEADER" ? (
        <SectionPanel
          className="mt-6"
          description={
            recommendations.length > 0
              ? "이번 주 가능 시간 중 과반수가 가능하다고 표시한 시간만 모았습니다. 시간을 고르고 템플릿을 선택하면 바로 일정이 생성됩니다."
              : "아직 과반수가 가능한 시간이 없습니다. 가능 시간을 더 입력받거나 직접 시간을 입력해 일정을 만들 수 있습니다."
          }
          title={
            recommendations.length > 0
              ? "추천 시간으로 일정 생성"
              : "새 일정 생성"
          }
        >
          {recommendations.length > 0 ? (
            <form action={createSchedule} className="grid gap-4">
              <fieldset className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <legend className="sr-only">추천 시간 선택</legend>
                {recommendations.map((slot, index) => (
                  <RecommendationCard
                    checked={index === 0}
                    key={`${slot.date}:${slot.hour}`}
                    slot={slot}
                  />
                ))}
              </fieldset>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <input
                  name="title"
                  required
                  className={inputClassName}
                  placeholder="일정 제목"
                />
                <TemplateSelect templates={templates} />
                <button className={primaryButtonClassName}>
                  추천 시간으로 일정 생성
                </button>
              </div>
            </form>
          ) : (
            <EmptyState
              description="캘린더에서 공대원 가능 시간이 더 모이면 과반수 추천 시간이 자동으로 표시됩니다."
              title="과반수 가능 시간이 없습니다."
            />
          )}
          <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              직접 시간 입력
            </summary>
            <form
              action={createSchedule}
              className="mt-3 grid gap-3 lg:grid-cols-[1fr_14rem_1fr_auto]"
            >
              <input
                name="title"
                required
                className={inputClassName}
                placeholder="일정 제목"
              />
              <input
                name="startsAt"
                required
                className={inputClassName}
                placeholder="2030-06-05T21:00:00+09:00"
              />
              <TemplateSelect templates={templates} />
              <button className={secondaryButtonClassName}>
                직접 입력으로 일정 생성
              </button>
            </form>
          </details>
        </SectionPanel>
      ) : (
        <div className="mt-6">
          <EmptyState title="공대장만 일정을 만들 수 있습니다." />
        </div>
      )}
      <SectionPanel className="mt-6" title="일정 목록">
        {schedules.length === 0 ? (
          <EmptyState title="등록된 일정이 없습니다." />
        ) : (
          <div className="divide-y divide-slate-100">
            {schedules.map((schedule) => {
              const openSlots = schedule.slots.filter(
                (slot) => !slot.assignedMemberId,
              ).length;
              return (
                <Link
                  className="grid gap-2 py-3 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  href={`/schedules/${schedule.id}`}
                  key={schedule.id}
                >
                  <div>
                    <div className="font-semibold text-slate-950">{schedule.title}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {schedule.template.name} / {schedule.template.difficulty}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {schedule.startsAt.toLocaleString("ko-KR")}
                  </div>
                  <div className="text-sm font-medium text-cyan-800">
                    빈자리 {openSlots}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionPanel>
    </main>
  );
}
