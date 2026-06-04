import { nanoid } from "nanoid";
import { db } from "@/server/db";

export async function createGroup(input: { name: string }) {
  return db.group.create({
    data: {
      name: input.name.trim(),
      inviteCode: nanoid(12),
      inviteEnabled: true,
    },
  });
}

export async function getGroupByInviteCode(inviteCode: string) {
  return db.group.findUnique({
    where: { inviteCode },
  });
}
