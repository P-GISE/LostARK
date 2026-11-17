import { headers } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";

export type AuthRateLimitScope = "login" | "signup";

export type AuthRateLimitTicket = {
  readonly key: string;
  readonly scope: AuthRateLimitScope;
};

type HeaderReader = {
  get(name: string): string | null;
};

type AuthRateLimitRule = {
  readonly maxAttempts: number;
  readonly windowMs: number;
};

type AuthRateLimitEntry = {
  readonly count: number;
  readonly resetAt: number;
};

const RATE_LIMIT_MESSAGE = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";

const AUTH_RATE_LIMIT_RULES = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
  },
} satisfies Record<AuthRateLimitScope, AuthRateLimitRule>;

const authRateLimitEntries = new Map<string, AuthRateLimitEntry>();
const bucketSecret = randomBytes(32);
let globalBudget = { count: 0, resetAt: 0 };

function normalizeIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return normalized || "anonymous";
}

function rateLimitKey(input: {
  readonly clientIp: string;
  readonly identifier: string;
  readonly scope: AuthRateLimitScope;
}) {
  const identity = [
    "auth",
    input.scope,
    input.clientIp,
    normalizeIdentifier(input.identifier),
  ].join(":");
  // shortcut: fixed buckets may share quotas; use shared storage before scaling replicas.
  return String(createHmac("sha256", bucketSecret).update(identity).digest().readUInt32BE(0) % 65536);
}

export function readClientIp(headerStore: HeaderReader) {
  const forwardedFor = headerStore
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return forwardedFor || headerStore.get("x-real-ip")?.trim() || "unknown";
}

export function consumeAuthRateLimit(input: {
  readonly clientIp: string;
  readonly identifier: string;
  readonly now?: number;
  readonly scope: AuthRateLimitScope;
}): AuthRateLimitTicket {
  const now = input.now ?? Date.now();
  const rule = AUTH_RATE_LIMIT_RULES[input.scope];
  if (globalBudget.resetAt <= now) globalBudget = { count: 0, resetAt: now + 1000 };
  if (globalBudget.count >= 100) throw new Error(RATE_LIMIT_MESSAGE);
  globalBudget.count += 1;
  const clientKey = "client:" + rateLimitKey({ ...input, identifier: "" });
  const client = authRateLimitEntries.get(clientKey);
  if (client && client.resetAt > now && client.count >= 20) throw new Error(RATE_LIMIT_MESSAGE);
  authRateLimitEntries.set(clientKey, client && client.resetAt > now
    ? { count: client.count + 1, resetAt: client.resetAt }
    : { count: 1, resetAt: now + 1000 });
  const key = rateLimitKey(input);
  const existing = authRateLimitEntries.get(key);

  if (!existing || existing.resetAt <= now) {
    authRateLimitEntries.set(key, {
      count: 1,
      resetAt: now + rule.windowMs,
    });
    return { key, scope: input.scope };
  }

  if (existing.count >= rule.maxAttempts) {
    throw new Error(RATE_LIMIT_MESSAGE);
  }

  authRateLimitEntries.set(key, {
    count: existing.count + 1,
    resetAt: existing.resetAt,
  });

  return { key, scope: input.scope };
}

export async function enforceAuthRateLimit(input: {
  readonly identifier: string;
  readonly scope: AuthRateLimitScope;
}) {
  const headerStore = await headers();
  return consumeAuthRateLimit({
    clientIp: readClientIp(headerStore),
    identifier: input.identifier,
    scope: input.scope,
  });
}

export function clearAuthRateLimit(ticket: AuthRateLimitTicket) {
  authRateLimitEntries.delete(ticket.key);
}

export function resetAuthRateLimitsForTests() {
  authRateLimitEntries.clear();
  globalBudget = { count: 0, resetAt: 0 };
}
