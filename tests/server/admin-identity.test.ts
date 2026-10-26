import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminUser, requireAdminUser } from "@/server/admin";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }),
}));

vi.mock("@/server/auth-context", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));

describe("administrator identity", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it("does not trust a newly registered user who claims an allowlisted email", async () => {
    vi.stubEnv("ADMIN_EMAILS", "reserved@example.invalid");
    const claimant = { id: "untrusted-user", email: "reserved@example.invalid" };
    expect(isAdminUser(claimant)).toBe(false);
    mocks.currentUser.mockResolvedValue(claimant);
    await expect(requireAdminUser()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("authorizes only explicitly configured immutable user IDs", () => {
    vi.stubEnv("ADMIN_USER_IDS", "trusted-user, second-user");
    expect(isAdminUser({ id: "trusted-user" })).toBe(true);
    expect(isAdminUser({ id: "second-user" })).toBe(true);
    expect(isAdminUser({ id: "untrusted-user" })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});
