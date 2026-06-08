import { describe, expect, it } from "vitest";
import {
  SAFE_TEST_DATABASE_URL,
  configureSafeTestDatabaseUrl,
  isSafeTestDatabaseUrl,
} from "../setup";

describe("test environment database safety", () => {
  it("keeps local PostgreSQL URLs for tests", () => {
    expect(
      isSafeTestDatabaseUrl(
        "postgresql://lostark:lostark@localhost:5432/lostark_party",
      ),
    ).toBe(true);
    expect(
      isSafeTestDatabaseUrl(
        "postgresql://lostark:lostark@postgres:5432/lostark_party",
      ),
    ).toBe(true);
    expect(
      isSafeTestDatabaseUrl(
        "postgresql://lostark:lostark@[::1]:5432/lostark_party",
      ),
    ).toBe(true);
  });

  it("replaces non-local DATABASE_URL values with the safe local test database", () => {
    const env = {
      DATABASE_URL: "postgresql://lostark:secret@100.64.0.10:5432/lostark_party",
    } as NodeJS.ProcessEnv;

    expect(configureSafeTestDatabaseUrl(env)).toBe(SAFE_TEST_DATABASE_URL);
    expect(env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
  });

  it("lets TEST_DATABASE_URL explicitly choose the test database", () => {
    const testDatabaseUrl =
      "postgresql://lostark:lostark@localhost:5432/lostark_party_ci";
    const env = {
      DATABASE_URL: "postgresql://lostark:secret@100.64.0.10:5432/lostark_party",
      TEST_DATABASE_URL: testDatabaseUrl,
    } as NodeJS.ProcessEnv;

    expect(configureSafeTestDatabaseUrl(env)).toBe(testDatabaseUrl);
    expect(env.DATABASE_URL).toBe(testDatabaseUrl);
  });
});
