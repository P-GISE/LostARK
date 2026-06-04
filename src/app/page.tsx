import { ScheduleCard } from "@/components/schedule-card";
import { requireCurrentMember } from "@/server/auth-context";
import { getDashboardSummary } from "@/server/dashboard";

export default async function HomePage() {
  const member = await requireCurrentMember();
  const summary = await getDashboardSummary(member.groupId);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Upcoming raids</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Members</div>
          <div className="mt-1 text-2xl font-semibold">{summary.memberCount}</div>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Missing availability</div>
          <div className="mt-1 text-2xl font-semibold">
            {summary.missingAvailabilityCount}
          </div>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <div className="text-sm text-zinc-500">Failed notifications</div>
          <div className="mt-1 text-2xl font-semibold">
            {summary.failedNotifications}
          </div>
        </div>
      </div>
      <section className="mt-6 grid gap-3">
        {summary.upcomingSchedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            title={schedule.title}
            startsAt={schedule.startsAt}
            openSlots={
              schedule.slots.filter((slot) => !slot.assignedMemberId).length
            }
          />
        ))}
      </section>
    </main>
  );
}
