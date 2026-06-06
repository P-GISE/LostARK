"use client";

import {
  inputClassName,
  primaryButtonClassName,
  selectClassName,
  textareaClassName,
} from "@/components/ui";

export function CharacterForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="grid gap-3">
      <input
        name="name"
        required
        className={inputClassName}
        placeholder="캐릭터명"
      />
      <input
        name="className"
        required
        className={inputClassName}
        placeholder="직업"
      />
      <input name="serverName" className={inputClassName} placeholder="서버" />
      <input
        name="itemLevel"
        required
        step="0.01"
        type="number"
        className={inputClassName}
        placeholder="아이템 레벨"
      />
      <input
        name="combatPower"
        min={0}
        step={1}
        type="number"
        className={inputClassName}
        placeholder="전투력"
      />
      <select
        name="preferredRole"
        className={selectClassName}
        defaultValue="DPS"
      >
        <option value="DPS">딜러</option>
        <option value="SUPPORT">서폿</option>
        <option value="FLEX">유동</option>
        <option value="OTHER">기타</option>
      </select>
      <textarea
        name="notes"
        className={textareaClassName}
        placeholder="메모"
      />
      <button className={primaryButtonClassName}>
        캐릭터 추가
      </button>
    </form>
  );
}
