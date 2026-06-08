import "@testing-library/jest-dom/vitest";

export const SAFE_TEST_DATABASE_URL =
  "postgresql://lostark:lostark@127.0.0.1:5432/lostark_party";

const SAFE_TEST_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "postgres",
]);

export function isSafeTestDatabaseUrl(value: string | undefined) {
  const databaseUrl = value?.trim();
  if (!databaseUrl) {
    return false;
  }

  try {
    const parsed = new URL(databaseUrl);
    return (
      ["postgres:", "postgresql:"].includes(parsed.protocol) &&
      SAFE_TEST_DATABASE_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function configureSafeTestDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
) {
  const explicitTestDatabaseUrl = env.TEST_DATABASE_URL?.trim();
  if (explicitTestDatabaseUrl) {
    env.DATABASE_URL = explicitTestDatabaseUrl;
    return env.DATABASE_URL;
  }

  if (!isSafeTestDatabaseUrl(env.DATABASE_URL)) {
    env.DATABASE_URL = SAFE_TEST_DATABASE_URL;
  }

  return env.DATABASE_URL;
}

configureSafeTestDatabaseUrl();
