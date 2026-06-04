import { revalidatePath } from "next/cache";
import { AvailabilityGrid } from "@/components/availability-grid";
import { saveAvailabilityBlock } from "@/server/availability";
import { requireCurrentMember } from "@/server/auth-context";

function toKstIso(date: string, hour: number) {
  return `${date}T${String(hour).padStart(2, "0")}:00:00+09:00`;
}

export default async function CalendarPage() {
  await requireCurrentMember();

  async function saveCell(change: {
    date: string;
    hour: number;
    status: "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";
  }) {
    "use server";
    const member = await requireCurrentMember();
    await saveAvailabilityBlock({
      memberId: member.id,
      date: change.date,
      startsAt: toKstIso(change.date, change.hour),
      endsAt: toKstIso(change.date, change.hour + 1),
      status: change.status,
      memo: "",
    });
    revalidatePath("/calendar");
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Mark your availability for today.
      </p>
      <div className="mt-6">
        <AvailabilityGrid date="2026-06-04" onChange={saveCell} />
      </div>
    </main>
  );
}
