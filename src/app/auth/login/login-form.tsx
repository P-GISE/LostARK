"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/auth/actions";
import {
  inputClassName,
  primaryButtonClassName,
} from "@/components/ui";

const initialState = { error: "" };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-6 grid gap-3"
    >
      <input name="next" type="hidden" value={nextPath} />
      <label className="grid gap-1 text-sm font-medium">
        이메일
        <input
          autoComplete="email"
          className={inputClassName}
          name="email"
          placeholder="이메일"
          required
          type="email"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        비밀번호
        <input
          autoComplete="current-password"
          className={inputClassName}
          name="password"
          placeholder="비밀번호"
          required
          type="password"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        className={primaryButtonClassName}
        disabled={isPending}
      >
        {isPending ? "처리 중" : "로그인"}
      </button>
    </form>
  );
}
