import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentMember, requireCurrentMember, setCurrentMemberSession } from "@/server/auth-context";
const mocks = vi.hoisted(() => ({ cookies: vi.fn(), memberFindUnique: vi.fn(), sessionFindUnique: vi.fn(), redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }) }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/db", () => ({ db: {
  member: { findUnique: mocks.memberFindUnique },
  user: { findUnique: vi.fn(async () => ({ id: "user-1" })) },
  authSession: { findUnique: mocks.sessionFindUnique },
} }));
const userToken = "1".repeat(64);
const memberToken = "2".repeat(64);
function installCookies(user = true) {
  mocks.cookies.mockResolvedValue({ get: (name: string) => name === "lostark_party_user" && user ? { value: userToken } : name === "lostark_party_member" ? { value: memberToken } : undefined });
  mocks.sessionFindUnique.mockImplementation(async ({ where }) => ({
    userId: where.tokenHash === createHash("sha256").update(userToken).digest("hex") ? "user-1" : null,
    memberId: where.tokenHash === createHash("sha256").update(memberToken).digest("hex") ? "member-1" : null,
    memberUserId: user ? "user-1" : null,
    expiresAt: new Date(Date.now() + 60000),
  }));
}
describe("member session ownership", () => {
  afterEach(() => vi.clearAllMocks());
  it("redirects missing member sessions to login", async () => {
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    await expect(requireCurrentMember({ loginRedirectPath: "/members" })).rejects.toThrow("NEXT_REDIRECT:/auth/login?next=%2Fmembers");
  });
  it("rejects a member belonging to another user", async () => {
    installCookies(); mocks.memberFindUnique.mockResolvedValue({ id: "member-1", userId: "user-2" });
    await expect(getCurrentMember()).resolves.toBeNull();
  });
  it("accepts the authenticated user's membership", async () => {
    installCookies(); const member = { id: "member-1", userId: "user-1" }; mocks.memberFindUnique.mockResolvedValue(member);
    await expect(getCurrentMember()).resolves.toBe(member);
  });
  it("requires the user session for an account-linked membership", async () => {
    installCookies(false); mocks.memberFindUnique.mockResolvedValue({ id: "member-1", userId: "user-1" });
    await expect(getCurrentMember()).resolves.toBeNull();
  });
  it("preserves an unlinked anonymous member's new opaque session", async () => {
    installCookies(false); const member = { id: "member-1", userId: null }; mocks.memberFindUnique.mockResolvedValue(member);
    await expect(getCurrentMember()).resolves.toBe(member);
  });
  it("does not mint a session for another user's member", async () => {
    installCookies(); mocks.memberFindUnique.mockResolvedValue({ id: "member-2", userId: "user-2" });
    await expect(setCurrentMemberSession("member-2")).rejects.toThrow("Member session ownership mismatch.");
  });
});
