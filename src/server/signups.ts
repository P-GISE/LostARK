import { compareRaidTemplateDisplay } from "@/lib/raid-template-display";
import { db } from "@/server/db";
import { requireCanManageSets } from "@/server/group-permissions";

export class RaidSignupError extends Error {
  readonly name = "RaidSignupError";
}

async function requireSignupOrganizer(input: {
  readonly actorMemberId: string;
  readonly signupId: string;
}) {
  const actor = await requireCanManageSets(input.actorMemberId);
  const signup = await db.raidSignup.findUnique({
    where: { id: input.signupId },
  });
  if (!signup) {
    throw new RaidSignupError("신청을 찾을 수 없습니다");
  }
  if (actor.groupId !== signup.groupId) {
    throw new RaidSignupError("같은 공대의 신청만 관리할 수 있습니다");
  }
  return { actor, signup };
}

export async function createRaidSignup(input: {
  readonly actorMemberId: string;
  readonly templateId: string;
  readonly title: string;
  readonly weekStartDate: string;
  readonly partySize: number;
  readonly maxParties: number;
}) {
  const actor = await requireCanManageSets(input.actorMemberId);
  const template = await db.raidTemplate.findUnique({
    where: { id: input.templateId },
  });
  if (!template || template.groupId !== actor.groupId) {
    throw new RaidSignupError("공대에 없는 레이드 템플릿입니다");
  }
  if (input.partySize < 1 || input.maxParties < 1) {
    throw new RaidSignupError("파티 크기와 최대 파티 수가 올바르지 않습니다");
  }

  return db.raidSignup.create({
    data: {
      createdByMemberId: actor.id,
      groupId: actor.groupId,
      maxParties: input.maxParties,
      partySize: input.partySize,
      templateId: template.id,
      title: input.title.trim(),
      weekStartDate: input.weekStartDate,
    },
    include: { entries: true, template: true },
  });
}

export async function listRaidSignups(groupId: string, weekStartDate: string) {
  const signups = await db.raidSignup.findMany({
    where: { groupId, status: { not: "CANCELED" }, weekStartDate },
    include: {
      assignments: { include: { raidSet: true }, orderBy: { partyNumber: "asc" } },
      entries: {
        include: { character: true, member: true },
        orderBy: { createdAt: "asc" },
        where: { status: { not: "CANCELED" } },
      },
      template: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return signups.sort(
    (a, b) =>
      compareRaidTemplateDisplay(a.template, b.template) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function applyToRaidSignup(input: {
  readonly signupId: string;
  readonly memberId: string;
  readonly characterId: string;
  readonly memo?: string;
}) {
  const signup = await db.raidSignup.findUnique({
    where: { id: input.signupId },
  });
  const character = await db.character.findUnique({
    include: { member: true },
    where: { id: input.characterId },
  });
  if (!signup || signup.status !== "OPEN") {
    throw new RaidSignupError("열려 있는 신청이 아닙니다");
  }
  if (
    !character ||
    character.memberId !== input.memberId ||
    character.member.groupId !== signup.groupId
  ) {
    throw new RaidSignupError("신청할 수 없는 캐릭터입니다");
  }

  return db.raidSignupEntry.upsert({
    where: {
      signupId_characterId: {
        characterId: input.characterId,
        signupId: input.signupId,
      },
    },
    create: {
      characterId: input.characterId,
      memberId: input.memberId,
      memo: input.memo?.trim() ?? "",
      signupId: input.signupId,
    },
    update: {
      memo: input.memo?.trim() ?? "",
      status: "APPLIED",
    },
  });
}

export async function cancelRaidSignupEntry(input: {
  readonly memberId: string;
  readonly entryId: string;
}) {
  const entry = await db.raidSignupEntry.findUnique({
    where: { id: input.entryId },
  });
  if (!entry || entry.memberId !== input.memberId) {
    throw new RaidSignupError("내 신청만 취소할 수 있습니다");
  }
  return db.raidSignupEntry.update({
    where: { id: input.entryId },
    data: { status: "CANCELED" },
  });
}

export async function assignRaidSignup(input: {
  readonly actorMemberId: string;
  readonly signupId: string;
}) {
  const { actor, signup } = await requireSignupOrganizer(input);
  const [entries, template] = await Promise.all([
    db.raidSignupEntry.findMany({
      where: { signupId: signup.id, status: "APPLIED" },
      orderBy: { createdAt: "asc" },
    }),
    db.raidTemplate.findUnique({
      where: { id: signup.templateId },
      include: { slots: { orderBy: { id: "asc" } } },
    }),
  ]);
  if (!template) {
    throw new RaidSignupError("레이드 템플릿을 찾을 수 없습니다");
  }
  if (signup.status !== "OPEN") {
    throw new RaidSignupError("열려 있는 신청만 배정할 수 있습니다");
  }
  const fullPartyCount = Math.min(
    Math.floor(entries.length / signup.partySize),
    signup.maxParties,
  );
  if (fullPartyCount < 1) {
    throw new RaidSignupError("배정할 신청 인원이 부족합니다");
  }

  return db.$transaction(async (tx) => {
    const createdSetIds: string[] = [];

    for (let partyIndex = 0; partyIndex < fullPartyCount; partyIndex += 1) {
      const partyEntries = entries.slice(
        partyIndex * signup.partySize,
        partyIndex * signup.partySize + signup.partySize,
      );
      const raidSet = await tx.raidSet.create({
        data: {
          createdByMemberId: actor.id,
          groupId: signup.groupId,
          label: `${signup.title} ${partyIndex + 1}파티`,
          templateId: signup.templateId,
          weekStartDate: signup.weekStartDate,
          slots: {
            create: template.slots.map((slot, slotIndex) => {
              const entry = partyEntries[slotIndex];
              return {
                assignedCharacterId: entry?.characterId ?? null,
                assignedMemberId: entry?.memberId ?? null,
                label: slot.label,
                order: slotIndex + 1,
                role: slot.role,
              };
            }),
          },
        },
      });
      createdSetIds.push(raidSet.id);
      await tx.raidSignupAssignment.create({
        data: {
          partyNumber: partyIndex + 1,
          raidSetId: raidSet.id,
          signupId: signup.id,
        },
      });
      await tx.raidSignupEntry.updateMany({
        where: { id: { in: partyEntries.map((entry) => entry.id) } },
        data: { assignedRaidSetId: raidSet.id, status: "ASSIGNED" },
      });
    }

    await tx.raidSignup.update({
      where: { id: signup.id },
      data: { status: "ASSIGNING" },
    });

    return createdSetIds;
  });
}

export async function finalizeRaidSignup(input: {
  readonly actorMemberId: string;
  readonly signupId: string;
}) {
  const { signup } = await requireSignupOrganizer(input);
  return db.$transaction(async (tx) => {
    await tx.raidSignupEntry.updateMany({
      where: { signupId: signup.id, status: "APPLIED" },
      data: { status: "FAILED" },
    });
    return tx.raidSignup.update({
      where: { id: signup.id },
      data: { status: "FINALIZED" },
    });
  });
}

export async function cancelRaidSignup(input: {
  readonly actorMemberId: string;
  readonly signupId: string;
}) {
  const { signup } = await requireSignupOrganizer(input);
  return db.raidSignup.update({
    where: { id: signup.id },
    data: { status: "CANCELED" },
  });
}
