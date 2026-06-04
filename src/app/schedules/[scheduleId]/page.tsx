import { requireCurrentMember } from "@/server/auth-context";
import { db } from "@/server/db";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  await requireCurrentMember();
  const { scheduleId } = await params;
  const schedule = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      slots: { include: { assignedMember: true, assignedCharacter: true } },
      template: true,
    },
  });

  if (!schedule) {
    return <main className="p-6">Schedule not found</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">{schedule.title}</h1>
      <section className="mt-6 grid gap-3">
        {schedule.slots.map((slot) => (
          <div className="rounded border border-zinc-200 p-4" key={slot.id}>
            <div className="font-medium">{slot.label}</div>
            <div className="text-sm text-zinc-600">
              {slot.assignedMember?.nickname ?? "Open"} /{" "}
              {slot.assignedCharacter?.name ?? "No character"}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
