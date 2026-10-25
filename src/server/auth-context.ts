import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

export const MEMBER_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "lostark_party_member";
export const USER_COOKIE_NAME =
  process.env.USER_COOKIE_NAME ?? "lostark_party_user";

const sessionCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
function tokenHash(token: string | undefined) {
  return token && /^[a-f0-9]{64}$/.test(token)
    ? createHash("sha256").update(token).digest("hex")
    : null;
}
async function readSession(token: string | undefined) {
  const hash = tokenHash(token);
  if (!hash) return null;
  const session = await db.authSession.findUnique({ where: { tokenHash: hash } });
  return session && session.expiresAt.getTime() > Date.now() ? session : null;
}
async function revokeSession(token: string | undefined) {
  const hash = tokenHash(token);
  if (hash) await db.authSession.deleteMany({ where: { tokenHash: hash } });
}
type SessionOwner =
  | { userId: string; memberId?: never; memberUserId?: never }
  | { memberId: string; userId?: never; memberUserId: string | null };

async function createSession(owner: SessionOwner) {
  const token = randomBytes(32).toString("hex");
  await db.authSession.create({
    data: {
      tokenHash: tokenHash(token)!,
      ...owner,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    },
  });
  return token;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get(USER_COOKIE_NAME)?.value);
  const userId = session?.userId;
  if (!userId) return null;

  return db.user.findUnique({
    where: { id: userId },
  });
}

export async function getCurrentMember() {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get(USER_COOKIE_NAME)?.value);
  const userId = session?.userId;
  const memberSession = await readSession(cookieStore.get(MEMBER_COOKIE_NAME)?.value);
  const memberId = memberSession?.memberId;
  if (!memberId) return null;

  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { group: true, user: true },
  });

  if (member && memberSession?.memberUserId !== member.userId) return null;
  if (member?.userId ? member.userId !== userId : Boolean(userId)) {
    return null;
  }

  return member;
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

export async function getMemberForUserInGroup(input: {
  userId: string;
  groupId: string;
}) {
  return db.member.findFirst({
    where: {
      groupId: input.groupId,
      userId: input.userId,
    },
    include: { group: true },
  });
}

export async function setCurrentUserSession(userId: string) {
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get(USER_COOKIE_NAME)?.value);
  cookieStore.set(
    USER_COOKIE_NAME,
    await createSession({ userId }),
    sessionCookieOptions,
  );
}

export async function setCurrentMemberSession(memberId: string) {
  const cookieStore = await cookies();
  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member does not exist.");
  const user = await getCurrentUser();
  if (member.userId ? member.userId !== user?.id : Boolean(user)) {
    throw new Error("Member session ownership mismatch.");
  }
  await revokeSession(cookieStore.get(MEMBER_COOKIE_NAME)?.value);
  cookieStore.set(
    MEMBER_COOKIE_NAME,
    await createSession({ memberId, memberUserId: member.userId }),
    sessionCookieOptions,
  );
}

export async function clearCurrentMemberSession() {
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get(MEMBER_COOKIE_NAME)?.value);
  cookieStore.delete(MEMBER_COOKIE_NAME);
}

export async function clearCurrentSessions() {
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get(USER_COOKIE_NAME)?.value);
  cookieStore.delete(USER_COOKIE_NAME);
  await revokeSession(cookieStore.get(MEMBER_COOKIE_NAME)?.value);
  cookieStore.delete(MEMBER_COOKIE_NAME);
}
