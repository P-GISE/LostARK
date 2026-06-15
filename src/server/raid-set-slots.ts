import { db } from "@/server/db";
import { RaidSetError, requireRaidSetManager } from "@/server/raid-set-access";

async function getManagedSlot(input: {
  readonly actorMemberId: string;
  readonly slotId: string;
}) {
  const slot = await db.raidSetSlot.findUnique({
    include: { raidSet: true },
    where: { id: input.slotId },
  });
  if (!slot) {
    throw new RaidSetError("편성 자리를 찾을 수 없습니다");
  }

  await requireRaidSetManager({
    actorMemberId: input.actorMemberId,
    raidSetId: slot.raidSetId,
  });

  return slot;
}

export async function assignRaidSetSlot(input: {
  readonly actorMemberId: string;
  readonly slotId: string;
  readonly characterId: string;
  readonly memberId?: string;
}) {
  const slot = await getManagedSlot(input);
  const character = await db.character.findUnique({
    include: { member: true },
    where: { id: input.characterId },
  });
  if (
    !character ||
    character.member.groupId !== slot.raidSet.groupId ||
    (input.memberId !== undefined && character.memberId !== input.memberId)
  ) {
    throw new RaidSetError("선택한 캐릭터가 해당 공대원의 캐릭터가 아닙니다");
  }

  const duplicate = await db.raidSetSlot.findFirst({
    where: {
      assignedCharacterId: character.id,
      raidSetId: slot.raidSetId,
      NOT: { id: input.slotId },
    },
  });
  if (duplicate) {
    throw new RaidSetError("이 편성에 이미 배정된 캐릭터입니다");
  }

  return db.raidSetSlot.update({
    data: {
      absent: false,
      absentReason: "",
      assignedCharacterId: character.id,
      assignedMemberId: character.memberId,
    },
    where: { id: input.slotId },
  });
}

export async function moveRaidSetSlot(input: {
  readonly actorMemberId: string;
  readonly slotId: string;
  readonly order: number;
}) {
  const slot = await getManagedSlot(input);

  return db.raidSetSlot.update({
    data: { order: input.order },
    where: { id: slot.id },
  });
}

export async function markRaidSetSlotAbsent(input: {
  readonly actorMemberId: string;
  readonly slotId: string;
  readonly absentReason: string;
}) {
  const slot = await getManagedSlot(input);

  return db.raidSetSlot.update({
    data: {
      absent: true,
      absentReason: input.absentReason.trim(),
      assignedCharacterId: null,
      assignedMemberId: null,
    },
    where: { id: slot.id },
  });
}

export async function unassignRaidSetSlot(input: {
  readonly actorMemberId: string;
  readonly slotId: string;
}) {
  const slot = await getManagedSlot(input);

  return db.$transaction(async (tx) => {
    const cleared = await tx.raidSetSlot.update({
      data: {
        absent: false,
        absentReason: "",
        assignedCharacterId: null,
        assignedMemberId: null,
      },
      where: { id: slot.id },
    });

    if (slot.assignedCharacterId !== null) {
      await tx.raidSignupEntry.updateMany({
        data: { assignedRaidSetId: null, status: "APPLIED" },
        where: {
          assignedRaidSetId: slot.raidSetId,
          characterId: slot.assignedCharacterId,
          status: "ASSIGNED",
        },
      });
    }

    return cleared;
  });
}
