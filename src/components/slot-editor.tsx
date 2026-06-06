import {
  Badge,
  dangerButtonClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/ui";

type CharacterOption = {
  id: string;
  name: string;
  className: string;
  itemLevel: number;
};

type SlotSummary = {
  id: string;
  label: string;
  assignedMemberNickname: string | null;
  assignedCharacterName: string | null;
};

export function SlotEditor({
  action,
  clearAction,
  characters,
  slot,
}: {
  action: (formData: FormData) => void | Promise<void>;
  clearAction?: (formData: FormData) => void | Promise<void>;
  characters: CharacterOption[];
  slot: SlotSummary;
}) {
  const assignedLabel =
    slot.assignedMemberNickname && slot.assignedCharacterName
      ? `${slot.assignedMemberNickname} / ${slot.assignedCharacterName}`
      : "비어 있음";

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input name="slotId" type="hidden" value={slot.id} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-slate-950">{slot.label}</div>
          <Badge tone={slot.assignedCharacterName ? "success" : "neutral"}>
            {assignedLabel}
          </Badge>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <select
          className={selectClassName}
          disabled={characters.length === 0}
          name="characterId"
          required
        >
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name} / {character.className} / {character.itemLevel}
            </option>
          ))}
        </select>
        <button
          className={primaryButtonClassName}
          disabled={characters.length === 0}
        >
          내 캐릭터 배정
        </button>
      </div>
      {characters.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          먼저 공대원 화면에서 캐릭터를 등록해 주세요.
        </p>
      ) : null}
      {clearAction && slot.assignedCharacterName ? (
        <button
          className={`${dangerButtonClassName} mt-2`}
          formAction={clearAction}
        >
          배정 해제
        </button>
      ) : null}
    </form>
  );
}
