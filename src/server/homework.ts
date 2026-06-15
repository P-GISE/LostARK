import { db } from "@/server/db";
import { requireCanManageHomework } from "@/server/group-permissions";

export class HomeworkError extends Error {
  readonly name = "HomeworkError";
}

async function loadHomeworkMutationContext(input: {
  readonly actorMemberId: string;
  readonly characterId: string;
  readonly raidTemplateId: string;
}) {
  const [actor, character, template] = await Promise.all([
    db.member.findUnique({ where: { id: input.actorMemberId } }),
    db.character.findUnique({
      include: { member: true },
      where: { id: input.characterId },
    }),
    db.raidTemplate.findUnique({ where: { id: input.raidTemplateId } }),
  ]);

  if (!actor || !character || actor.groupId !== character.member.groupId) {
    throw new HomeworkError("숙제 체크를 변경할 수 없습니다");
  }
  if (!template || template.groupId !== actor.groupId) {
    throw new HomeworkError("공대에 없는 레이드 템플릿입니다");
  }
  if (actor.role !== "LEADER" && character.memberId !== actor.id) {
    await requireCanManageHomework(actor.id);
  }

  return { actor, template };
}

export async function listHomeworkStatus(
  groupId: string,
  weekStartDate: string,
) {
  const [members, templates, checks] = await Promise.all([
    db.member.findMany({
      where: { groupId },
      include: { characters: { orderBy: [{ isMain: "desc" }, { name: "asc" }] } },
      orderBy: { createdAt: "asc" },
    }),
    db.raidTemplate.findMany({
      where: { groupId },
      orderBy: [{ name: "asc" }, { difficulty: "asc" }, { gates: "asc" }],
    }),
    db.characterRaidCheck.findMany({
      where: {
        weekStartDate,
        character: { member: { groupId } },
      },
    }),
  ]);
  const completedKeys = new Set(
    checks.map((check) => `${check.characterId}:${check.raidTemplateId}`),
  );

  return {
    members: members.map((member) => {
      const characters = member.characters.map((character) => {
        const raids = templates.map((template) => ({
          completed: completedKeys.has(`${character.id}:${template.id}`),
          difficulty: template.difficulty,
          gates: template.gates,
          raidTemplateId: template.id,
          raidTemplateName: template.name,
        }));

        return {
          id: character.id,
          name: character.name,
          raids,
        };
      });
      const completedCount = characters.reduce(
        (count, character) =>
          count + character.raids.filter((raid) => raid.completed).length,
        0,
      );
      const totalCount = characters.reduce(
        (count, character) => count + character.raids.length,
        0,
      );

      return {
        characters,
        completedCount,
        id: member.id,
        nickname: member.nickname,
        totalCount,
      };
    }),
    weekStartDate,
  };
}

export async function setHomeworkCompleted(input: {
  readonly actorMemberId: string;
  readonly characterId: string;
  readonly completed: boolean;
  readonly raidTemplateId: string;
  readonly weekStartDate: string;
}) {
  const { template } = await loadHomeworkMutationContext(input);

  if (!input.completed) {
    return db.characterRaidCheck.deleteMany({
      where: {
        characterId: input.characterId,
        raidTemplateId: input.raidTemplateId,
        weekStartDate: input.weekStartDate,
      },
    });
  }

  return db.$transaction(async (tx) => {
    await tx.characterRaidCheck.deleteMany({
      where: {
        characterId: input.characterId,
        raidTemplate: {
          groupId: template.groupId,
          name: template.name,
        },
        weekStartDate: input.weekStartDate,
      },
    });

    return tx.characterRaidCheck.create({
      data: {
        characterId: input.characterId,
        raidTemplateId: input.raidTemplateId,
        weekStartDate: input.weekStartDate,
      },
    });
  });
}
