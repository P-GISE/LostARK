import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { getGroupByInviteCode } from "@/server/groups";

export async function joinGroupByInvite(input: {
  inviteCode: string;
  nickname: string;
}) {
  const nickname = input.nickname.trim();
  if (nickname.length < 2) {
    throw new Error("Nickname must be at least 2 characters");
  }

  const group = await getGroupByInviteCode(input.inviteCode);
  if (!group || !group.inviteEnabled) {
    throw new Error("Invite link is invalid or disabled");
  }

  try {
    return await db.member.create({
      data: {
        groupId: group.id,
        nickname,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Nickname is already used in this group");
    }
    throw error;
  }
}

export async function listMembers(groupId: string) {
  return db.member.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: { characters: true },
  });
}
