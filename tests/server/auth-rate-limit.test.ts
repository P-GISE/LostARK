import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAuthRateLimit,
  consumeAuthRateLimit,
  readClientIp,
  resetAuthRateLimitsForTests,
} from "@/server/auth-rate-limit";

describe("auth rate limit", () => {
  beforeEach(() => {
    resetAuthRateLimitsForTests();
  });

  it("limits repeated login attempts for the same client and identifier", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(() =>
        consumeAuthRateLimit({
          clientIp: "203.0.113.1",
          identifier: "USER@example.com",
          now: 1000,
          scope: "login",
        }),
      ).not.toThrow();
    }

    expect(() =>
      consumeAuthRateLimit({
        clientIp: "203.0.113.1",
        identifier: "user@example.com",
        now: 1000,
        scope: "login",
      }),
    ).toThrow("요청이 너무 많습니다");
  });

  it("clears a consumed rate limit ticket after a successful auth flow", () => {
    const ticket = consumeAuthRateLimit({
      clientIp: "203.0.113.1",
      identifier: "user@example.com",
      now: 1000,
      scope: "login",
    });

    clearAuthRateLimit(ticket);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(() =>
        consumeAuthRateLimit({
          clientIp: "203.0.113.1",
          identifier: "user@example.com",
          now: 1000,
          scope: "login",
        }),
      ).not.toThrow();
    }
  });

  it("reads the first forwarded IP before falling back to direct IP headers", () => {
    const headers = {
      get: vi.fn((name: string) => {
        if (name === "x-forwarded-for") {
          return "203.0.113.1, 10.0.0.1";
        }
        if (name === "x-real-ip") {
          return "198.51.100.1";
        }
        return null;
      }),
    };

    expect(readClientIp(headers)).toBe("203.0.113.1");
  });
});
