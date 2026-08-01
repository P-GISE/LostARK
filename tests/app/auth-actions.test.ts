import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction, signupAction } from "@/app/auth/actions";

const mocks = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  clearAuthRateLimit: vi.fn(),
  clearCurrentMemberSession: vi.fn(),
  createUser: vi.fn(),
  enforceAuthRateLimit: vi.fn(),
  getFirstMemberForUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  setCurrentMemberSession: vi.fn(),
  setCurrentUserSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/server/accounts", () => ({
  authenticateUser: mocks.authenticateUser,
  createUser: mocks.createUser,
}));

vi.mock("@/server/auth-context", () => ({
  clearCurrentMemberSession: mocks.clearCurrentMemberSession,
  clearCurrentSessions: vi.fn(),
  getFirstMemberForUser: mocks.getFirstMemberForUser,
  setCurrentMemberSession: mocks.setCurrentMemberSession,
  setCurrentUserSession: mocks.setCurrentUserSession,
}));

vi.mock("@/server/auth-rate-limit", () => ({
  clearAuthRateLimit: mocks.clearAuthRateLimit,
  enforceAuthRateLimit: mocks.enforceAuthRateLimit,
}));

function authFormData(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceAuthRateLimit.mockResolvedValue({ key: "ticket", scope: "login" });
  });

  it("clears a stale member session when a login user has no memberships", async () => {
    mocks.authenticateUser.mockResolvedValue({ id: "user-without-group" });
    mocks.getFirstMemberForUser.mockResolvedValue(null);

    await expect(
      loginAction(
        { error: "" },
        authFormData({
          email: "user@example.com",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/groups/new");

    expect(mocks.setCurrentUserSession).toHaveBeenCalledWith("user-without-group");
    expect(mocks.enforceAuthRateLimit).toHaveBeenCalledWith({
      identifier: "user@example.com",
      scope: "login",
    });
    expect(mocks.clearCurrentMemberSession).toHaveBeenCalled();
    expect(mocks.setCurrentMemberSession).not.toHaveBeenCalled();
  });

  it("sets the first membership when a login user belongs to a group", async () => {
    mocks.authenticateUser.mockResolvedValue({ id: "user-with-group" });
    mocks.getFirstMemberForUser.mockResolvedValue({ id: "member-1" });

    await expect(
      loginAction(
        { error: "" },
        authFormData({
          email: "user@example.com",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/");

    expect(mocks.setCurrentMemberSession).toHaveBeenCalledWith("member-1");
    expect(mocks.clearAuthRateLimit).toHaveBeenCalledWith({
      key: "ticket",
      scope: "login",
    });
    expect(mocks.clearCurrentMemberSession).not.toHaveBeenCalled();
  });

  it("clears a stale member session after signup before following the next path", async () => {
    mocks.createUser.mockResolvedValue({ id: "new-user" });

    await expect(
      signupAction(
        { error: "" },
        authFormData({
          displayName: "새 유저",
          email: "new@example.com",
          next: "/invite/invite-1",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/invite/invite-1");

    expect(mocks.setCurrentUserSession).toHaveBeenCalledWith("new-user");
    expect(mocks.enforceAuthRateLimit).toHaveBeenCalledWith({
      identifier: "new@example.com",
      scope: "signup",
    });
    expect(mocks.clearCurrentMemberSession).toHaveBeenCalled();
  });

  it("returns a rate limit error before attempting login", async () => {
    mocks.enforceAuthRateLimit.mockRejectedValue(
      new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요."),
    );

    await expect(
      loginAction(
        { error: "" },
        authFormData({
          email: "user@example.com",
          password: "password123",
        }),
      ),
    ).resolves.toEqual({
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    });

    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });
});
