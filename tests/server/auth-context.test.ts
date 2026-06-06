import { afterEach, describe, expect, it, vi } from "vitest";
import {
  signSessionValue,
  verifySessionValue,
} from "@/server/auth-context";

describe("auth context session values", () => {
  afterEach(() => {
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

  it("can use DATABASE_URL as a production fallback until SESSION_SECRET is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost/app");

    const signed = signSessionValue("member-1");

    expect(verifySessionValue(signed)).toBe("member-1");
  });
});
