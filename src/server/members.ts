import { Prisma } from "@prisma/client";
import { sortCharactersForDisplay } from "@/lib/character-display";
import { db } from "@/server/db";
import { getGroupByInviteCode } from "@/server/groups";

export async function joinGroupByInvite(input: {
  inviteCode: string;
  nickname: string;
  userId?: string;
}) {
  const nickname = input.nickname.trim();
  if (nickname.length < 2) {
    throw new Error("닉네임은 2자 이상이어야 합니다");
  }

  const group = await getGroupByInviteCode(input.inviteCode);
  if (!group || !group.inviteEnabled) {
    throw new Error("초대 링크가 잘못되었거나 비활성화되었습니다");
  }

  if (input.userId) {
    const existingMember = await db.member.findFirst({
      where: {
        groupId: group.id,
        userId: input.userId,
      },
    });

    if (existingMember) {
      throw new Error("이미 이 공대에 가입되어 있습니다");
    }
  }

  try {
    return await db.member.create({
      data: {
        groupId: group.id,
        nickname,
        userId: input.userId,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("이 공대에서 이미 사용하는 닉네임입니다");
    }
    throw error;
  }
}

export async function listMembers(groupId: string) {
  const members = await db.member.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: { characters: true },
  });

  return members.map((member) => ({
    ...member,
    characters: sortCharactersForDisplay(member.characters),
  }));
}

export async function connectDiscordMember(input: {
  memberId: string;
  discordUserId: string;
}) {
  if (!input.discordUserId.trim()) {
    throw new Error("디스코드 사용자 ID가 필요합니다");
  }

  return db.member.update({
    where: { id: input.memberId },
    data: {
      discordUserId: input.discordUserId.trim(),
      discordConnectedAt: new Date(),
    },
  });
}
