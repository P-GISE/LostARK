"use client";

import {
  inputClassName,
  primaryButtonClassName,
  textareaClassName,
} from "@/components/ui";

export function TemplateForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-3">
      <input
        className={inputClassName}
        name="name"
        placeholder="레이드 이름"
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputClassName}
          name="difficulty"
          placeholder="난이도"
          required
        />
        <input
          className={inputClassName}
          name="gates"
          placeholder="관문"
          required
        />
        <input
          className={inputClassName}
          min={1}
          name="requiredPlayers"
          placeholder="필요 인원"
          required
          type="number"
        />
        <input
          className={inputClassName}
          min={0}
          name="dpsSlots"
          placeholder="딜러 자리 수"
          required
          type="number"
        />
        <input
          className={inputClassName}
          min={0}
          name="supportSlots"
          placeholder="서폿 자리 수"
          required
          type="number"
        />
      </div>
      <textarea
        className={textareaClassName}
        name="requirements"
        placeholder="참가 조건"
      />
      <textarea
        className={textareaClassName}
        name="notes"
        placeholder="메모"
      />
      <button className={primaryButtonClassName}>
        템플릿 생성
      </button>
    </form>
  );
}
