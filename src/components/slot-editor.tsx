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
  const isAssigned = Boolean(slot.assignedCharacterName);
  const statusLabel = isAssigned ? "배정됨" : "빈 자리";

  return (
    <details
      className="group bg-white open:bg-slate-50/40"
      data-testid="slot-editor-row"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold text-slate-950">{slot.label}</div>
            <Badge tone={isAssigned ? "success" : "neutral"}>{statusLabel}</Badge>
          </div>
          {isAssigned ? (
            <div className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                {slot.assignedMemberNickname}
              </span>
              <span className="text-slate-300">/</span>
              <span className="break-words">{slot.assignedCharacterName}</span>
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-500">배정된 캐릭터 없음</div>
          )}
        </div>
        <div className="shrink-0 text-xs font-semibold text-slate-500 group-open:hidden">
          배정 변경
        </div>
        <div className="hidden shrink-0 text-xs font-semibold text-slate-500 group-open:block">
          닫기
        </div>
      </summary>

      <form
        action={action}
        className="grid gap-2 border-t border-slate-100 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <input name="slotId" type="hidden" value={slot.id} />
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
        {characters.length === 0 ? (
          <p className="text-sm text-slate-500 sm:col-span-2">
            등록된 캐릭터 없음
          </p>
        ) : null}
        {clearAction && isAssigned ? (
          <button
            className={`${dangerButtonClassName} sm:col-span-2`}
            formAction={clearAction}
          >
            배정 해제
          </button>
        ) : null}
      </form>
    </details>
  );
}
