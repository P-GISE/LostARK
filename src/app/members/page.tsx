import { revalidatePath } from "next/cache";
import { CharacterForm } from "@/components/character-form";
import { createCharacter } from "@/server/characters";
import { requireCurrentMember } from "@/server/auth-context";
import { listMembers } from "@/server/members";

export default async function MembersPage() {
  const currentMember = await requireCurrentMember();
  const members = await listMembers(currentMember.groupId);

  async function addCharacter(formData: FormData) {
    "use server";
    const member = await requireCurrentMember();
    await createCharacter({
      memberId: member.id,
      name: String(formData.get("name") ?? ""),
      className: String(formData.get("className") ?? ""),
      itemLevel: Number(formData.get("itemLevel") ?? 0),
      preferredRole: String(formData.get("preferredRole") ?? "DPS") as "DPS",
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath("/members");
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Members</h1>
      <section className="mt-6">
        <h2 className="text-lg font-medium">My characters</h2>
        <div className="mt-3 max-w-md">
          <CharacterForm action={addCharacter} />
        </div>
      </section>
      <section className="mt-8 grid gap-3">
        {members.map((member) => (
          <div className="rounded border border-zinc-200 p-4" key={member.id}>
            <div className="font-medium">{member.nickname}</div>
            <div className="mt-2 text-sm text-zinc-600">
              {member.characters.map((character) => character.name).join(", ") ||
                "No characters"}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
