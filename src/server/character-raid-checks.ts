import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import { db } from "@/server/db";

export type CharacterRaidCheckListItem = {
  characterId: string;
  raidTemplateId: string;
  weekStartDate: string;
};

function resolveWeekStartDate(input: {
  now?: Date;
  weekStartDate?: string;
}) {
  const explicitWeekStartDate = input.weekStartDate?.trim();
  return explicitWeekStartDate || getLostArkWeekStartDate(input.now);
}

async function requireManageableCharacter(input: {
  actorMemberId: string;
  characterId: string;
}) {
  const [actor, character] = await Promise.all([
    db.member.findUnique({
      where: { id: input.actorMemberId },
    }),
    db.character.findUnique({
      include: { member: true },
      where: { id: input.characterId },
    }),
  ]);

  if (!actor || !character || actor.groupId !== character.member.groupId) {
    throw new Error("체크리스트를 변경할 수 없습니다");
  }

  if (actor.role !== "LEADER" && character.memberId !== actor.id) {
    throw new Error("내 캐릭터만 체크할 수 있습니다");
  }

  return { actor, character };
}

export async function listCharacterRaidChecksForGroup(input: {
  groupId: string;
  now?: Date;
  weekStartDate?: string;
}): Promise<CharacterRaidCheckListItem[]> {
  const weekStartDate = resolveWeekStartDate(input);
  const checks = await db.characterRaidCheck.findMany({
    orderBy: [{ characterId: "asc" }, { raidTemplateId: "asc" }],
    select: {
      characterId: true,
      raidTemplateId: true,
      weekStartDate: true,
    },
    where: {
      weekStartDate,
      character: {
        member: {
          groupId: input.groupId,
        },
      },
    },
  });

  return checks;
}

export async function setCharacterRaidCheck(input: {
  actorMemberId: string;
  characterId: string;
  completed: boolean;
  now?: Date;
  raidTemplateId: string;
  weekStartDate?: string;
}) {
  const weekStartDate = resolveWeekStartDate(input);
  const { actor } = await requireManageableCharacter(input);
  const template = await db.raidTemplate.findUnique({
    select: { groupId: true },
    where: { id: input.raidTemplateId },
  });

  if (!template || template.groupId !== actor.groupId) {
    throw new Error("공대에 없는 레이드 템플릿입니다");
  }

  if (!input.completed) {
    return db.characterRaidCheck.deleteMany({
      where: {
        characterId: input.characterId,
        raidTemplateId: input.raidTemplateId,
        weekStartDate,
      },
    });
  }

  return db.characterRaidCheck.upsert({
    create: {
      characterId: input.characterId,
      raidTemplateId: input.raidTemplateId,
      weekStartDate,
    },
    update: {
      completedAt: new Date(),
    },
    where: {
      characterId_raidTemplateId_weekStartDate: {
        characterId: input.characterId,
        raidTemplateId: input.raidTemplateId,
        weekStartDate,
      },
    },
  });
}
