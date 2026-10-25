import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { createUser } from "@/server/accounts";
import { clearCurrentMemberSession, clearCurrentSessions, getCurrentMember, getCurrentUser, setCurrentMemberSession, setCurrentUserSession, USER_COOKIE_NAME, MEMBER_COOKIE_NAME } from "@/server/auth-context";

const state = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => state.cookies.has(name) ? { value: state.cookies.get(name)! } : undefined,
  set: (name: string, value: string) => state.cookies.set(name, value),
  delete: (name: string) => state.cookies.delete(name),
}) }));
const users: string[] = [];
const groups: string[] = [];
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
async function user() {
  const result = await createUser({ email: `session-${randomUUID()}@example.invalid`, password: "synthetic-password-123", displayName: "Synthetic Session" });
  users.push(result.id); return result;
}
describe("PostgreSQL session lifecycle", () => {
  afterEach(async () => {
    state.cookies.clear();
    await db.group.deleteMany({ where: { id: { in: groups.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  it("persists expiry and revocation across independent database clients", async () => {
    const owner = await user();
    await setCurrentUserSession(owner.id);
    const copied = state.cookies.get(USER_COOKIE_NAME)!;
    const independent = new PrismaClient();
    try {
      expect(await independent.authSession.findUnique({ where: { tokenHash: digest(copied) } })).toMatchObject({ userId: owner.id });
      await clearCurrentSessions();
      state.cookies.set(USER_COOKIE_NAME, copied);
      await expect(getCurrentUser()).resolves.toBeNull();
      expect(await independent.authSession.findUnique({ where: { tokenHash: digest(copied) } })).toBeNull();
      await setCurrentUserSession(owner.id);
      const tokenHash = digest(state.cookies.get(USER_COOKIE_NAME)!);
      await independent.authSession.update({ where: { tokenHash }, data: { expiresAt: new Date(0) } });
      await expect(getCurrentUser()).resolves.toBeNull();
    } finally { await independent.$disconnect(); }
  });
  it("revokes member cookies and preserves linked-user ownership", async () => {
    const owner = await user();
    const group = await db.group.create({ data: { name: "Synthetic Session", inviteCode: randomUUID() } }); groups.push(group.id);
    const member = await db.member.create({ data: { groupId: group.id, userId: owner.id, nickname: "Synthetic" } });
    await setCurrentUserSession(owner.id);
    await setCurrentMemberSession(member.id);
    await expect(getCurrentMember()).resolves.toMatchObject({ id: member.id });
    const copied = state.cookies.get(MEMBER_COOKIE_NAME)!;
    await clearCurrentMemberSession();
    state.cookies.set(MEMBER_COOKIE_NAME, copied);
    await expect(getCurrentMember()).resolves.toBeNull();
    await setCurrentMemberSession(member.id);
    state.cookies.delete(USER_COOKIE_NAME);
    await expect(getCurrentMember()).resolves.toBeNull();
  });
  it("rejects legacy cookies and cascades records when their owner is deleted", async () => {
    const owner = await user();
    state.cookies.set(USER_COOKIE_NAME, "legacy.signed-cookie");
    await expect(getCurrentUser()).resolves.toBeNull();
    await setCurrentUserSession(owner.id);
    const tokenHash = digest(state.cookies.get(USER_COOKIE_NAME)!);
    await db.user.delete({ where: { id: owner.id } });
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(await db.authSession.findUnique({ where: { tokenHash } })).toBeNull();
  });
});
