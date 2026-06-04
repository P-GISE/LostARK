"use client";

export function CharacterForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="grid gap-3 rounded border border-zinc-200 p-4">
      <input
        name="name"
        required
        className="rounded border px-3 py-2"
        placeholder="Character name"
      />
      <input
        name="className"
        required
        className="rounded border px-3 py-2"
        placeholder="Class"
      />
      <input
        name="itemLevel"
        required
        type="number"
        className="rounded border px-3 py-2"
        placeholder="Item level"
      />
      <select
        name="preferredRole"
        className="rounded border px-3 py-2"
        defaultValue="DPS"
      >
        <option value="DPS">DPS</option>
        <option value="SUPPORT">Support</option>
        <option value="FLEX">Flex</option>
        <option value="OTHER">Other</option>
      </select>
      <textarea
        name="notes"
        className="rounded border px-3 py-2"
        placeholder="Notes"
      />
      <button className="rounded bg-zinc-950 px-4 py-2 text-white">
        Add character
      </button>
    </form>
  );
}
