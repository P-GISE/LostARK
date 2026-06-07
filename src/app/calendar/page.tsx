import { revalidatePath } from "next/cache";
import { AvailabilityStatus } from "@prisma/client";
import { AvailabilityGrid } from "@/components/availability-grid";
import { AvailabilityOverview } from "@/components/availability-overview";
import { PageHeader, SectionPanel, pageShellClassName } from "@/components/ui";
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
import { requireCurrentMember } from "@/server/auth-context";

type Status = keyof typeof AvailabilityStatus;

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

export default async function CalendarPage() {
  const member = await requireCurrentMember();
  const now = new Date();
  const days = buildLostArkWeekDays();
  const rangeStart = kstSlotDate(days[0].date, DAY_START_HOUR);
  const rangeEnd = kstSlotDate(days[days.length - 1].date, DAY_END_HOUR);
  const blocks = await listAvailabilityForMember(member.id, rangeStart, rangeEnd);
  const groupOverview =
    member.role === "LEADER"
      ? await getGroupAvailabilityOverview({
          groupId: member.groupId,
          dates: days.map((day) => day.date),
          hours: availabilityHours,
        })
      : [];
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

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="공대원별 참가 가능 시간을 모아 일정 후보를 빠르게 판단합니다."
        eyebrow="공대 운영"
        title="가능 시간"
      />
      <SectionPanel
        className="mt-6"
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
      {member.role === "LEADER" ? (
        <div className="mt-6">
          <AvailabilityOverview slots={groupOverview} />
        </div>
      ) : null}
    </main>
  );
}
