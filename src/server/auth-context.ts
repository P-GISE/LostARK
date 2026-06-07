import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

export const MEMBER_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "lostark_party_member";
export const USER_COOKIE_NAME =
  process.env.USER_COOKIE_NAME ?? "lostark_party_user";

const sessionCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 60,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function parseEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readLocalEnvValue(name: string) {
  if (process.env.VITEST) {
    return null;
  }

  const envPaths = new Set<string>();
  envPaths.add(join(process.cwd(), ".env"));

  let currentDir = __dirname;
  for (let depth = 0; depth < 8; depth += 1) {
    envPaths.add(join(currentDir, ".env"));
    const parent = dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  try {
    const prefix = `${name}=`;
    for (const envPath of envPaths) {
      if (!existsSync(envPath)) {
        continue;
      }
      const contents = readFileSync(envPath, "utf8");
      const line = contents
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(prefix));

      if (line) {
        return parseEnvValue(line.slice(prefix.length));
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getConfiguredSessionSecret() {
  const sessionSecret =
    process.env.SESSION_SECRET?.trim() ?? readLocalEnvValue("SESSION_SECRET");
  if (sessionSecret) {
    return sessionSecret;
  }

  const databaseUrl =
    process.env.DATABASE_URL?.trim() ?? readLocalEnvValue("DATABASE_URL");
  if (process.env.NODE_ENV === "production" && databaseUrl) {
    return `lostark-party-session:${databaseUrl}`;
  }

  return null;
}

function getRequiredSessionSecret() {
  const secret = getConfiguredSessionSecret();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required.");
  }
  return "lostark-party-planner-dev-session-secret";
}

function getOptionalSessionSecret() {
  const secret = getConfiguredSessionSecret();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return "lostark-party-planner-dev-session-secret";
}

function sessionSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSessionValue(
  value: string,
  secret = getRequiredSessionSecret(),
) {
  const payload = Buffer.from(value, "utf8").toString("base64url");
  return `${payload}.${sessionSignature(payload, secret)}`;
}

export function verifySessionValue(value: string, secret?: string | null) {
  const sessionSecret =
    secret === undefined ? getOptionalSessionSecret() : secret;
  if (!sessionSecret) {
    return null;
  }

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  const expected = sessionSignature(payload, sessionSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return decoded.trim() ? decoded : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawUserId = cookieStore.get(USER_COOKIE_NAME)?.value;
  const userId = rawUserId ? verifySessionValue(rawUserId) : null;
  if (!userId) return null;

  return db.user.findUnique({
    where: { id: userId },
  });
}

export async function getCurrentMember() {
  const cookieStore = await cookies();
  const rawMemberId = cookieStore.get(MEMBER_COOKIE_NAME)?.value;
  const memberId = rawMemberId ? verifySessionValue(rawMemberId) : null;
  if (!memberId) return null;

  return db.member.findUnique({
    where: { id: memberId },
    include: { group: true, user: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Login is required.");
  }
  return user;
}

function loginRedirectPath(nextPath: string) {
  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("://")
      ? nextPath
      : "/";
  return `/auth/login?next=${encodeURIComponent(safeNextPath)}`;
}

export async function requireCurrentMember(options?: {
  loginRedirectPath?: string;
}) {
  const member = await getCurrentMember();
  if (!member) {
    if (options?.loginRedirectPath) {
      redirect(loginRedirectPath(options.loginRedirectPath));
    }
    throw new Error("Member session is required.");
  }
  return member;
}

export async function getFirstMemberForUser(userId: string) {
  return db.member.findFirst({
    where: { userId },
    include: { group: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function setCurrentUserSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    USER_COOKIE_NAME,
    signSessionValue(userId),
    sessionCookieOptions,
  );
}

export async function setCurrentMemberSession(memberId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    MEMBER_COOKIE_NAME,
    signSessionValue(memberId),
    sessionCookieOptions,
  );
}

export async function clearCurrentSessions() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE_NAME);
  cookieStore.delete(MEMBER_COOKIE_NAME);
}
