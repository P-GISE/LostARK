import type { SlotRole } from "@prisma/client";
import { db } from "@/server/db";

export type SignupReadinessStatus = "READY" | "WARNING" | "BLOCKED";

export type SignupReadinessEntry = {
  readonly entryId: string;
  readonly status: SignupReadinessStatus;
  readonly reasons: readonly string[];
};

const STALE_SYNC_MS = 7 * 24 * 60 * 60 * 1000;

function statusFromReasons(input: {
  readonly blocked: readonly string[];
  readonly warnings: readonly string[];
}): SignupReadinessStatus {
  if (input.blocked.length > 0) {
    return "BLOCKED";
  }
  if (input.warnings.length > 0) {
    return "WARNING";
  }

  return "READY";
}

function roleWarnings(input: {
  readonly preferredRole: SlotRole;
  readonly requiredRoles: ReadonlySet<SlotRole>;
}) {
  if (input.preferredRole === "OTHER") {
    return ["선호 역할 미정"];
  }
  if (
    input.requiredRoles.size > 0 &&
    !input.requiredRoles.has(input.preferredRole) &&
    input.preferredRole !== "FLEX"
  ) {
    return ["템플릿 역할과 선호 역할 확인 필요"];
  }

  return [];
}

function syncWarnings(input: {
  readonly lastSyncedAt: Date | null;
  readonly now: Date;
}) {
  if (!input.lastSyncedAt) {
    return ["캐릭터 동기화 없음"];
  }
  if (input.now.getTime() - input.lastSyncedAt.getTime() > STALE_SYNC_MS) {
    return ["캐릭터 정보 오래됨"];
  }

  return [];
}

export async function buildSignupReadiness(
  signupId: string,
  now = new Date(),
): Promise<SignupReadinessEntry[]> {
  const signup = await db.raidSignup.findUnique({
    include: {
      entries: {
        include: { character: true, member: true },
        orderBy: { createdAt: "asc" },
        where: { status: { not: "CANCELED" } },
      },
      template: { include: { slots: true } },
    },
    where: { id: signupId },
  });
  if (!signup) {
    throw new Error("모집을 찾을 수 없습니다");
  }

  const requiredRoles = new Set(
    signup.template.slots
      .map((slot) => slot.role)
      .filter((role) => role !== "FLEX" && role !== "OTHER"),
  );

  return signup.entries.map((entry) => {
    const blocked = [
      ...(signup.template.minimumItemLevel != null &&
      entry.character.itemLevel < signup.template.minimumItemLevel
        ? [
            `아이템 레벨 ${entry.character.itemLevel} / ${signup.template.minimumItemLevel}`,
          ]
        : []),
      ...(signup.template.minimumCombatPower != null &&
      entry.character.combatPower != null &&
      entry.character.combatPower < signup.template.minimumCombatPower
        ? [
            `전투력 ${entry.character.combatPower} / ${signup.template.minimumCombatPower}`,
          ]
        : []),
    ];
    const warnings = [
      ...(signup.template.minimumCombatPower != null &&
      entry.character.combatPower == null
        ? ["전투력 미확인"]
        : []),
      ...roleWarnings({
        preferredRole: entry.character.preferredRole,
        requiredRoles,
      }),
      ...syncWarnings({ lastSyncedAt: entry.character.lastSyncedAt, now }),
      ...(entry.member.discordUserId ? [] : ["디스코드 미연결"]),
    ];

    return {
      entryId: entry.id,
      reasons:
        blocked.length > 0 || warnings.length > 0
          ? [...blocked, ...warnings]
          : ["기준 충족"],
      status: statusFromReasons({ blocked, warnings }),
    };
  });
}
