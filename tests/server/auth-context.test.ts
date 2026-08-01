import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentMember,
  requireCurrentMember,
  signSessionValue,
  verifySessionValue,
} from "@/server/auth-context";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  memberFindUnique: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/server/db", () => ({
  db: {
    member: {
      findUnique: mocks.memberFindUnique,
    },
  },
}));

describe("auth context session values", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("verifies a signed session value", () => {
    const signed = signSessionValue("member-1", "test-secret");

    expect(verifySessionValue(signed, "test-secret")).toBe("member-1");
  });

  it("rejects unsigned or tampered session values", () => {
    const signed = signSessionValue("member-1", "test-secret");
    const [, signature] = signed.split(".");
    const tampered = `${Buffer.from("member-2", "utf8").toString(
      "base64url",
    )}.${signature}`;

    expect(verifySessionValue("member-1", "test-secret")).toBeNull();
    expect(verifySessionValue(tampered, "test-secret")).toBeNull();
    expect(verifySessionValue(signed, "other-secret")).toBeNull();
  });

  it("treats cookies as invalid instead of throwing when production secret is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");

    expect(verifySessionValue("legacy-member-cookie")).toBeNull();
    expect(verifySessionValue("payload.signature")).toBeNull();
  });

  it("does not reuse DATABASE_URL as a production session signing secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost/app");

    expect(() => signSessionValue("member-1")).toThrow(
      "SESSION_SECRET environment variable is required.",
    );
  });

  it("redirects missing member sessions to login for protected pages", async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    });

    await expect(
      requireCurrentMember({ loginRedirectPath: "/members" }),
    ).rejects.toThrow("NEXT_REDIRECT:/auth/login?next=%2Fmembers");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/auth/login?next=%2Fmembers",
    );
  });

  it("rejects a member cookie that belongs to a different logged-in user", async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === "lostark_party_user") {
          return { value: signSessionValue("user-2") };
        }
        if (name === "lostark_party_member") {
          return { value: signSessionValue("member-1") };
        }
        return undefined;
      }),
    });
    mocks.memberFindUnique.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
    });

    await expect(getCurrentMember()).resolves.toBeNull();
  });

  it("accepts a member cookie that belongs to the logged-in user", async () => {
    const member = {
      id: "member-1",
      userId: "user-1",
    };
    mocks.cookies.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === "lostark_party_user") {
          return { value: signSessionValue("user-1") };
        }
        if (name === "lostark_party_member") {
          return { value: signSessionValue("member-1") };
        }
        return undefined;
      }),
    });
    mocks.memberFindUnique.mockResolvedValue(member);

    await expect(getCurrentMember()).resolves.toBe(member);
  });
});
