import { db } from "@/server/db";
import {
  fetchLostArkCharacterProfile,
  fetchLostArkSiblingCharacters,
  type LostArkCharacterProfile,
} from "@/server/lostark-api";

const AUTO_SYNC_STALE_MS = 5 * 60 * 1000;
const DEFAULT_AUTO_SYNC_BATCH_SIZE = 20;

function sameCharacter(a: string, b: string) {
  return a.trim().toLocaleLowerCase("ko-KR") === b.trim().toLocaleLowerCase("ko-KR");
}

function inferPreferredRole(className: string) {
  return ["바드", "홀리나이트", "도화가", "발키리"].includes(className)
    ? "SUPPORT"
    : "DPS";
}

export async function syncLostArkCharactersForMember(input: {
  memberId: string;
  mainCharacterName: string;
  now?: Date;
}) {
  const mainCharacterName = input.mainCharacterName.trim();
  if (!mainCharacterName) {
    throw new Error("본캐 캐릭터명을 입력해 주세요");
  }

  const siblings = await fetchLostArkSiblingCharacters(mainCharacterName);
  const mainSibling = siblings.find((sibling) =>
    sameCharacter(sibling.characterName, mainCharacterName),
  );
  if (!mainSibling) {
    throw new Error(
      "입력한 본캐를 같은 계정 캐릭터 목록에서 찾지 못했습니다",
    );
  }

  const sameServerSiblings = siblings.filter(
    (sibling) => sibling.serverName === mainSibling.serverName,
  );
  const profiles = await Promise.all(
    sameServerSiblings.map((sibling) =>
      fetchLostArkCharacterProfile(sibling.characterName),
    ),
  );
  if (
    profiles.some((profile) => profile.serverName !== mainSibling.serverName)
  ) {
    throw new Error("같은 서버 캐릭터만 동기화할 수 있습니다");
  }

  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    await tx.character.updateMany({
      where: { memberId: input.memberId },
      data: { isMain: false },
    });

    let importedCount = 0;
    let updatedCount = 0;

    for (const profile of profiles) {
      const existing =
        (await tx.character.findFirst({
          where: {
            memberId: input.memberId,
            name: profile.characterName,
            serverName: profile.serverName,
          },
        })) ??
        (await tx.character.findFirst({
          where: {
            memberId: input.memberId,
            name: profile.characterName,
            serverName: "",
          },
        }));
      const data = {
        name: profile.characterName,
        className: profile.className,
        serverName: profile.serverName,
        itemLevel: profile.itemLevel,
        combatPower: profile.combatPower,
        isMain: sameCharacter(profile.characterName, mainCharacterName),
        lastSyncedAt: now,
      };

      if (existing) {
        await tx.character.update({
          where: { id: existing.id },
          data,
        });
        updatedCount += 1;
      } else {
        await tx.character.create({
          data: {
            ...data,
            memberId: input.memberId,
            preferredRole: inferPreferredRole(profile.className),
            notes: "",
          },
        });
        importedCount += 1;
      }
    }

    return {
      importedCount,
      updatedCount,
      skippedOtherServerCount: siblings.length - sameServerSiblings.length,
      serverName: mainSibling.serverName,
    };
  });
}

export type SyncedLostArkCharacter = LostArkCharacterProfile;

export async function syncLostArkCharactersForMembersWithMainCharacters({
  batchSize,
  groupId,
  now = new Date(),
}: {
  batchSize?: number;
  groupId?: string;
  now?: Date;
} = {}) {
  const staleBefore = new Date(now.getTime() - AUTO_SYNC_STALE_MS);
  const take =
    batchSize && Number.isFinite(batchSize) && batchSize > 0
      ? Math.floor(batchSize)
      : DEFAULT_AUTO_SYNC_BATCH_SIZE;
  const dueMainCharacterWhere = {
    isMain: true,
    OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lte: staleBefore } }],
  };
  const members = await db.member.findMany({
    where: {
      ...(groupId ? { groupId } : {}),
      characters: {
        some: dueMainCharacterWhere,
      },
    },
    include: {
      characters: {
        where: dueMainCharacterWhere,
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "asc" },
    take,
  });

  const failures: Array<{
    error: string;
    mainCharacterName: string;
    memberId: string;
  }> = [];
  let syncedCount = 0;

  for (const member of members) {
    const mainCharacter = member.characters[0];
    if (!mainCharacter) {
      continue;
    }

    try {
      await syncLostArkCharactersForMember({
        memberId: member.id,
        mainCharacterName: mainCharacter.name,
        now,
      });
      syncedCount += 1;
    } catch (error) {
      failures.push({
        error: error instanceof Error ? error.message : "알 수 없는 동기화 오류",
        mainCharacterName: mainCharacter.name,
        memberId: member.id,
      });
    }
  }

  return {
    failedCount: failures.length,
    failures,
    syncedCount,
  };
}
