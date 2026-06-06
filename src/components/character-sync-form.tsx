"use client";

import { useActionState } from "react";
import {
  inputClassName,
  primaryButtonClassName,
} from "@/components/ui";

export type CharacterSyncFormState = { error: string };

const initialState: CharacterSyncFormState = { error: "" };

export function CharacterSyncForm({
  action,
}: {
  action: (
    state: CharacterSyncFormState,
    formData: FormData,
  ) => CharacterSyncFormState | Promise<CharacterSyncFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-3">
        <input
          className={inputClassName}
          name="mainCharacterName"
          placeholder="본캐 캐릭터명"
          required
        />
        <button className={`${primaryButtonClassName} w-full`} disabled={isPending}>
          {isPending ? "불러오는 중" : "본캐로 캐릭터 불러오기"}
        </button>
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
