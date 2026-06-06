"use server";

import {
  clearCurrentSessions,
  getFirstMemberForUser,
  setCurrentMemberSession,
  setCurrentUserSession,
} from "@/server/auth-context";
import { authenticateUser, createUser } from "@/server/accounts";
import { redirect } from "next/navigation";

type AuthFormState = {
  error: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "요청을 처리하지 못했습니다";
}

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const path = value.trim();
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return null;
  }

  return path;
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  let target = "/groups/new";

  try {
    const user = await createUser({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
    });
    await setCurrentUserSession(user.id);
    target = safeNextPath(formData.get("next")) ?? target;
  } catch (error) {
    return { error: getErrorMessage(error) };
  }

  redirect(target);
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  let target = "/groups/new";

  try {
    const user = await authenticateUser({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    await setCurrentUserSession(user.id);

    const nextPath = safeNextPath(formData.get("next"));
    if (nextPath) {
      target = nextPath;
    } else {
      const member = await getFirstMemberForUser(user.id);
      if (member) {
        await setCurrentMemberSession(member.id);
        target = "/";
      }
    }
  } catch (error) {
    return { error: getErrorMessage(error) };
  }

  redirect(target);
}

export async function logoutAction() {
  await clearCurrentSessions();
  redirect("/");
}
