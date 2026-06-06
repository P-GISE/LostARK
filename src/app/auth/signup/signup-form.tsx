"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/auth/actions";
import {
  inputClassName,
  primaryButtonClassName,
} from "@/components/ui";

const initialState = { error: "" };

export function SignupForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(
    signupAction,
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
          autoComplete="new-password"
          className={inputClassName}
          minLength={8}
          name="password"
          placeholder="비밀번호"
          required
          type="password"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        공대 확인용 이름
        <input
          autoComplete="name"
          className={inputClassName}
          minLength={2}
          name="displayName"
          placeholder="공대 확인용 이름"
          required
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
        {isPending ? "처리 중" : "계정 만들기"}
      </button>
    </form>
  );
}
