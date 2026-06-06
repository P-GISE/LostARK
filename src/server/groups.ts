import { nanoid } from "nanoid";
import { db } from "@/server/db";
import { importDefaultRaidTemplatesForGroup } from "@/server/raid-templates";

function cleanName(name: string, label: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error(`${label}은 2자 이상이어야 합니다`);
  }
  return trimmed;
}

export async function createGroup(input: { name: string }) {
  return db.group.create({
    data: {
      name: cleanName(input.name, "공대 이름"),
      inviteCode: nanoid(12),
      inviteEnabled: true,
    },
  });
}

export async function createGroupWithLeader(input: {
  groupName: string;
  leaderNickname: string;
  userId?: string;
}) {
  const group = await db.group.create({
    data: {
      name: cleanName(input.groupName, "공대 이름"),
      inviteCode: nanoid(12),
      inviteEnabled: true,
      members: {
        create: {
          nickname: cleanName(input.leaderNickname, "닉네임"),
          role: "LEADER",
          userId: input.userId,
        },
      },
    },
    include: { members: true },
  });

  await importDefaultRaidTemplatesForGroup(group.id);

  return {
    group,
    leader: group.members[0],
  };
}

export async function getGroupByInviteCode(inviteCode: string) {
  return db.group.findUnique({
    where: { inviteCode },
  });
}

async function requireGroupLeader(input: {
  actorMemberId: string;
  groupId: string;
}) {
  const leader = await db.member.findFirst({
    where: {
      id: input.actorMemberId,
      groupId: input.groupId,
      role: "LEADER",
    },
  });

  if (!leader) {
    throw new Error("공대장만 설정을 변경할 수 있습니다");
  }

  return leader;
}

export async function updateGroupSettings(input: {
  actorMemberId: string;
  groupId: string;
  name: string;
  inviteEnabled: boolean;
}) {
  await requireGroupLeader(input);

  return db.group.update({
    where: { id: input.groupId },
    data: {
      name: cleanName(input.name, "공대 이름"),
      inviteEnabled: input.inviteEnabled,
    },
  });
}

export async function rotateGroupInviteCode(input: {
  actorMemberId: string;
  groupId: string;
}) {
  await requireGroupLeader(input);

  return db.group.update({
    where: { id: input.groupId },
    data: {
      inviteCode: nanoid(12),
      inviteEnabled: true,
    },
  });
}
