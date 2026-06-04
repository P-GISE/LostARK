import { createRaidTemplate, listRaidTemplates } from "@/server/raid-templates";
import { requireCurrentMember } from "@/server/auth-context";

export default async function TemplatesPage() {
  const member = await requireCurrentMember();
  const templates = await listRaidTemplates(member.groupId);

  async function createDefaultTemplate() {
    "use server";
    const current = await requireCurrentMember();
    await createRaidTemplate({
      groupId: current.groupId,
      name: "Thaemine Hard",
      difficulty: "Hard",
      gates: "1-3",
      requiredPlayers: 8,
      requirements: "Clear experience required",
      notes: "Check consumables before start",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
        {
          label: "DPS 2",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
        {
          label: "DPS 3",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
        {
          label: "Support 1",
          role: "SUPPORT",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Raid templates</h1>
      <form action={createDefaultTemplate} className="mt-4">
        <button className="rounded bg-zinc-950 px-4 py-2 text-white">
          Add Thaemine starter template
        </button>
      </form>
      <section className="mt-6 grid gap-3">
        {templates.map((template) => (
          <div className="rounded border border-zinc-200 p-4" key={template.id}>
            <div className="font-medium">
              {template.name} {template.gates}
            </div>
            <div className="text-sm text-zinc-600">
              {template.slots.length} slots
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
