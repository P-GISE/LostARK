import { afterEach, describe, expect, it, vi } from "vitest";
import { signOAuthValue, verifyOAuthValue } from "@/server/signed-oauth-state";

describe("OAuth state signing", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("verifies a signed value and rejects unsigned or tampered state", () => {
    const signed = signOAuthValue("member-1", "test-secret");
    expect(verifyOAuthValue(signed, "test-secret")).toBe("member-1");
    const [, signature] = signed.split(".");
    const tampered = `${Buffer.from("member-2").toString("base64url")}.${signature}`;
    expect(verifyOAuthValue("member-1", "test-secret")).toBeNull();
    expect(verifyOAuthValue(tampered, "test-secret")).toBeNull();
    expect(verifyOAuthValue(signed, "other-secret")).toBeNull();
  });
  it("fails closed when the production signing secret is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@localhost/test");
    expect(verifyOAuthValue("payload.signature")).toBeNull();
    expect(() => signOAuthValue("member-1")).toThrow("SESSION_SECRET environment variable is required.");
  });
});
