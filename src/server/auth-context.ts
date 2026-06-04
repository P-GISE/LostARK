import { cookies } from "next/headers";
import { db } from "@/server/db";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "lostark_party_member";

export async function getCurrentMember() {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(COOKIE_NAME)?.value;
  if (!memberId) return null;

  return db.member.findUnique({
    where: { id: memberId },
    include: { group: true },
  });
}

export async function requireCurrentMember() {
  const member = await getCurrentMember();
  if (!member) {
    throw new Error("Member session is required");
  }
  return member;
}
