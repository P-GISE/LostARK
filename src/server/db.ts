import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const SAFE_TEST_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "postgres",
]);

function assertSafeTestDatabaseUrl() {
  if (!process.env.VITEST && process.env.NODE_ENV !== "test") {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required while tests are running.");
  }

  try {
    const parsed = new URL(databaseUrl);
    if (
      ["postgres:", "postgresql:"].includes(parsed.protocol) &&
      SAFE_TEST_DATABASE_HOSTS.has(parsed.hostname)
    ) {
      return;
    }
  } catch {
    // Fall through to the refusal below.
  }

  throw new Error(
    "Refusing to initialize Prisma with a non-local DATABASE_URL while tests are running.",
  );
}

assertSafeTestDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
