import { requireCurrentMember } from "@/server/auth-context";
import { listRaidTemplates } from "@/server/raid-templates";
import {
  createScheduleFromTemplate,
  listUpcomingSchedules,
} from "@/server/schedules";

export default async function SchedulesPage() {
  const member = await requireCurrentMember();
  const schedules = await listUpcomingSchedules(member.groupId);
  const templates = await listRaidTemplates(member.groupId);

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
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Schedules</h1>
      <form
        action={createSchedule}
        className="mt-4 grid gap-3 rounded border border-zinc-200 p-4"
      >
        <input
          name="title"
          required
          className="rounded border px-3 py-2"
          placeholder="Schedule title"
        />
        <input
          name="startsAt"
          required
          className="rounded border px-3 py-2"
          placeholder="2026-06-05T21:00:00+09:00"
        />
        <select name="templateId" className="rounded border px-3 py-2">
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} {template.gates}
            </option>
          ))}
        </select>
        <button className="rounded bg-zinc-950 px-4 py-2 text-white">
          Create schedule
        </button>
      </form>
      <section className="mt-6 grid gap-3">
        {schedules.map((schedule) => (
          <a
            className="rounded border border-zinc-200 p-4"
            href={`/schedules/${schedule.id}`}
            key={schedule.id}
          >
            <div className="font-medium">{schedule.title}</div>
            <div className="text-sm text-zinc-600">
              {schedule.startsAt.toLocaleString("ko-KR")}
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
