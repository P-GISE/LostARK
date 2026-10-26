import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCurrentSessions, getCurrentUser, setCurrentUserSession, USER_COOKIE_NAME } from "@/server/auth-context";

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  rows: new Map<string, { tokenHash: string; userId: string; memberId: null; expiresAt: Date }>(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => state.cookies.has(name) ? { value: state.cookies.get(name)! } : undefined,
  set: (name: string, value: string) => state.cookies.set(name, value),
  delete: (name: string) => state.cookies.delete(name),
}) }));
vi.mock("@/server/db", () => ({ db: {
  authSession: {
    create: vi.fn(async ({ data }) => { state.rows.set(data.tokenHash, data); return data; }),
    findUnique: vi.fn(async ({ where }) => state.rows.get(where.tokenHash) ?? null),
    deleteMany: vi.fn(async ({ where }) => { state.rows.delete(where.tokenHash); return { count: 1 }; }),
  },
  user: { findUnique: vi.fn(async ({ where }) => ({ id: where.id })) },
} }));

describe("durable user sessions", () => {
  beforeEach(() => { state.cookies.clear(); state.rows.clear(); });
  it("stores only a random token digest and enforces server expiry", async () => {
    await setCurrentUserSession("user-1");
    const token = state.cookies.get(USER_COOKIE_NAME)!;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const digest = createHash("sha256").update(token).digest("hex");
    const row = state.rows.get(digest)!;
    expect(row.userId).toBe("user-1");
    await expect(getCurrentUser()).resolves.toEqual({ id: "user-1" });
    row.expiresAt = new Date(0);
    await expect(getCurrentUser()).resolves.toBeNull();
  });
  it("rejects a copied cookie after logout, including another module instance", async () => {
    await setCurrentUserSession("user-1");
    const copied = state.cookies.get(USER_COOKIE_NAME)!;
    await clearCurrentSessions();
    state.cookies.set(USER_COOKIE_NAME, copied);
    vi.resetModules();
    const restarted = await import("@/server/auth-context");
    await expect(restarted.getCurrentUser()).resolves.toBeNull();
  });
});
