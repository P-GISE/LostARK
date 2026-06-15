import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AvailabilityStatus } from "@prisma/client";
import { AvailabilityGrid } from "@/components/availability-grid";
import { AvailabilityCockpitHeader } from "@/components/availability-cockpit";
import { AvailabilityPresetsPanel } from "@/components/availability/availability-presets-panel";
import { AvailabilityOverview } from "@/components/availability-overview";
import {
  EmptyState,
  PageHeader,
  SectionPanel,
  pageShellClassName,
} from "@/components/ui";
import {
  availabilityHours,
  DAY_END_HOUR,
  DAY_START_HOUR,
} from "@/lib/availability-hours";
import { buildLostArkWeekDays } from "@/lib/lostark-week";
import { isKstAvailabilitySlotInPast } from "@/lib/time-slots";
import {
  clearAvailabilitySlot,
  formatKstDate,
  getGroupAvailabilityOverview,
  kstSlotDate,
  listAvailabilityForMember,
  setAvailabilitySlot,
} from "@/server/availability";
import { deleteStaleAvailabilityBlocksForGroup } from "@/server/availability-reset";
import {
  createAvailabilityPreset,
  listAvailabilityPresets,
  saveAvailabilityWeekOverride,
} from "@/server/availability-presets";
import { requireCurrentMember } from "@/server/auth-context";
import { listUpcomingSchedules } from "@/server/schedules";

type Status = keyof typeof AvailabilityStatus;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function kstHour(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours();
}

function statusKey(block: {
  date: Date;
  startsAt: Date;
}) {
  const baseDate = formatKstDate(block.date);
  const startsAtDate = formatKstDate(block.startsAt);
  const hour = kstHour(block.startsAt) + (startsAtDate === baseDate ? 0 : 24);

  return `${baseDate}:${hour}`;
}

function formatScheduleTime(startsAt: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(startsAt);
}

function hasEditableAvailabilitySlot(
  days: ReturnType<typeof buildLostArkWeekDays>,
  now: Date,
) {
  return days.some((day) =>
    availabilityHours.some(
      (hour) => !isKstAvailabilitySlotInPast(day.date, hour, now),
    ),
  );
}

function buildEditableWeekDays(now: Date) {
  const currentWeekDays = buildLostArkWeekDays(now);
  if (hasEditableAvailabilitySlot(currentWeekDays, now)) {
    return currentWeekDays;
  }

  return buildLostArkWeekDays(new Date(now.getTime() + WEEK_MS));
}

export default async function CalendarPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/calendar" });
  const now = new Date();
  await deleteStaleAvailabilityBlocksForGroup({
    groupId: member.groupId,
    now,
  });
  const schedules = await listUpcomingSchedules(member.groupId, now);
  const days = buildEditableWeekDays(now);
  const rangeStart = kstSlotDate(days[0].date, DAY_START_HOUR);
  const rangeEnd = kstSlotDate(days[days.length - 1].date, DAY_END_HOUR);
  const blocks = await listAvailabilityForMember(member.id, rangeStart, rangeEnd);
  const presets = await listAvailabilityPresets(member.id);
  const groupOverview = await getGroupAvailabilityOverview({
    groupId: member.groupId,
    dates: days.map((day) => day.date),
    hours: availabilityHours,
  });
  const initialStatuses = Object.fromEntries(
    blocks.map((block) => [statusKey(block), block.status]),
  ) as Record<string, Status>;
  const disabledSlotKeys = days.flatMap((day) =>
    availabilityHours
      .filter((hour) => isKstAvailabilitySlotInPast(day.date, hour, now))
      .map((hour) => `${day.date}:${hour}`),
  );

  async function saveCells(changes: Array<{
    date: string;
    hour: number;
    status: Status | null;
  }>) {
    "use server";
    const member = await requireCurrentMember();

    for (const change of changes) {
      if (change.status) {
        await setAvailabilitySlot({
          memberId: member.id,
          date: change.date,
          hour: change.hour,
          status: change.status,
        });
      } else {
        await clearAvailabilitySlot({
          memberId: member.id,
          date: change.date,
          hour: change.hour,
        });
      }
    }

    revalidatePath("/calendar");
  }

  async function createPreset(formData: FormData) {
    "use server";
    const member = await requireCurrentMember();
    await createAvailabilityPreset({
      memberId: member.id,
      mode: "WEEKLY",
      name: String(formData.get("name") ?? ""),
      slots: [
        {
          dayOfWeek: Number(formData.get("dayOfWeek") ?? 0),
          endTime: String(formData.get("endTime") ?? ""),
          startTime: String(formData.get("startTime") ?? ""),
        },
      ],
    });
    revalidatePath("/calendar");
  }

  async function saveWeekOverride(formData: FormData) {
    "use server";
    const member = await requireCurrentMember();
    await saveAvailabilityWeekOverride({
      memberId: member.id,
      slots: [
        {
          dayOfWeek: Number(formData.get("dayOfWeek") ?? 0),
          endTime: String(formData.get("endTime") ?? ""),
          startTime: String(formData.get("startTime") ?? ""),
        },
      ],
      weekStartDate: String(formData.get("weekStartDate") ?? days[0].date),
    });
    revalidatePath("/calendar");
  }

  return (
    <main className={`${pageShellClassName} availability-cockpit`}>
      <PageHeader
        description="공대원별 참가 가능 시간을 모아 일정 후보를 빠르게 판단합니다."
        eyebrow="공대 운영"
        title="가능 시간"
      />
      <AvailabilityCockpitHeader days={days} scheduleCount={schedules.length} />
      <div id="my-availability">
        <SectionPanel
          className="availability-panel mt-6"
          description="요일과 시간대를 선택해 참가 가능 여부를 빠르게 입력합니다."
          title="내 가능 시간 입력"
        >
          <AvailabilityGrid
            days={days}
            disabledSlotKeys={disabledSlotKeys}
            initialStatuses={initialStatuses}
            onChange={saveCells}
          />
        </SectionPanel>
      </div>
      <AvailabilityPresetsPanel
        createPresetAction={createPreset}
        presets={presets}
        saveOverrideAction={saveWeekOverride}
      />
      <div
        className="availability-panel availability-panel--overview mt-6"
        id="group-availability"
      >
        <AvailabilityOverview slots={groupOverview} />
      </div>
      <div id="upcoming-schedules">
        <SectionPanel
          className="availability-panel mt-6"
          description="앞으로 진행할 공대 일정을 확인합니다."
          title="일정"
        >
          {schedules.length === 0 ? (
            <EmptyState
              description="일정 페이지에서 새 일정을 만들면 여기에 표시됩니다."
              title="등록된 예정 일정이 없습니다."
            />
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
                      <div className="font-semibold text-slate-950">
                        {schedule.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {schedule.template.name} /{" "}
                        {schedule.template.difficulty}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatScheduleTime(schedule.startsAt)}
                    </div>
                    <div className="text-sm font-medium text-teal-800">
                      빈자리 {openSlots}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionPanel>
      </div>
    </main>
  );
}
