import { revalidatePath } from "next/cache";
import {
  CharacterSyncForm,
  type CharacterSyncFormState,
} from "@/components/character-sync-form";
import { CharacterForm } from "@/components/character-form";
import {
  Badge,
  EmptyState,
  PageHeader,
  SectionPanel,
  balancedPanelGridClassName,
  cx,
  pageShellClassName,
} from "@/components/ui";
import { formatCombatPower, formatItemLevel } from "@/lib/character-display";
import { syncLostArkCharactersForMember } from "@/server/character-sync";
import { requireCurrentMember } from "@/server/auth-context";
import { createCharacter } from "@/server/characters";
import { listMembers } from "@/server/members";

const preferredRoles = ["DPS", "SUPPORT", "FLEX", "OTHER"] as const;

function parsePreferredRole(value: FormDataEntryValue | null) {
  if (
    typeof value === "string" &&
    preferredRoles.includes(value as (typeof preferredRoles)[number])
  ) {
    return value as (typeof preferredRoles)[number];
  }
  throw new Error("선호 역할이 올바르지 않습니다");
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

function formatSyncedAt(value: Date | null) {
  if (!value) {
    return "아직 동기화되지 않음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(value);
}

function getLatestSyncedAt(
  characters: Array<{ lastSyncedAt: Date | null }>,
) {
  return characters.reduce<Date | null>((latest, character) => {
    if (!character.lastSyncedAt) return latest;
    if (!latest || character.lastSyncedAt > latest) {
      return character.lastSyncedAt;
    }
    return latest;
  }, null);
}

export default async function MembersPage() {
  const currentMember = await requireCurrentMember({ loginRedirectPath: "/members" });
  const members = await listMembers(currentMember.groupId);

  async function syncCharacters(
    _state: CharacterSyncFormState,
    formData: FormData,
  ): Promise<CharacterSyncFormState> {
    "use server";
    try {
      const member = await requireCurrentMember();
      await syncLostArkCharactersForMember({
        memberId: member.id,
        mainCharacterName: String(formData.get("mainCharacterName") ?? ""),
      });
      revalidatePath("/members");
      return { error: "" };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "캐릭터를 불러오지 못했습니다.",
      };
    }
  }

  async function addManualCharacter(formData: FormData) {
    "use server";
    const member = await requireCurrentMember();
    await createCharacter({
      memberId: member.id,
      name: String(formData.get("name") ?? ""),
      className: String(formData.get("className") ?? ""),
      serverName: String(formData.get("serverName") ?? ""),
      itemLevel: Number(formData.get("itemLevel") ?? 0),
      combatPower: parseOptionalNumber(formData.get("combatPower")),
      preferredRole: parsePreferredRole(formData.get("preferredRole")),
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath("/members");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="본캐 기준으로 같은 서버의 모든 캐릭터, 아이템 레벨, 전투력을 로스트아크 OpenAPI에서 동기화합니다."
        eyebrow="공대 관리"
        title="공대원"
      />
      <div className={cx("mt-5", balancedPanelGridClassName)}>
        <div className="grid min-w-0 content-start gap-4">
          <SectionPanel
            description="처음 등록하거나 본캐를 바꿀 때만 입력합니다. 이후 캐릭터 정보는 서버에서 자동으로 갱신됩니다."
            title="본캐로 캐릭터 불러오기"
          >
            <CharacterSyncForm action={syncCharacters} />
          </SectionPanel>
          <SectionPanel title="동기화 방식">
            <div className="grid gap-2 text-sm leading-6 text-slate-600">
              <p>5분마다 자동 업데이트</p>
              <p>
                캐릭터명, 직업, 서버, 아이템 레벨, 전투력은 OpenAPI 값으로만 표시합니다.
              </p>
            </div>
          </SectionPanel>
          <SectionPanel
            description="OpenAPI 동기화가 어렵거나 보정이 필요한 캐릭터는 직접 등록할 수 있습니다."
            title="내 캐릭터 수동 추가"
          >
            <CharacterForm action={addManualCharacter} />
          </SectionPanel>
        </div>
        <section className="grid min-w-0 content-start gap-4">
          {members.map((member) => {
            const latestSyncedAt = getLatestSyncedAt(member.characters);

            return (
              <SectionPanel
                description={`마지막 동기화: ${formatSyncedAt(latestSyncedAt)}`}
                key={member.id}
                title={member.nickname}
              >
                {member.characterSyncFailedAt ||
                member.characterSyncFailureReason ? (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="font-semibold">최근 자동동기화 실패</div>
                    <div className="mt-1 text-xs leading-5">
                      {member.characterSyncFailureReason ??
                        "알 수 없는 동기화 오류"}
                    </div>
                    {member.characterSyncFailedAt ? (
                      <div className="mt-1 text-xs text-amber-800">
                        실패 시각: {formatSyncedAt(member.characterSyncFailedAt)}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {member.characters.length === 0 ? (
                  <EmptyState title="등록된 캐릭터가 없습니다." />
                ) : (
                  <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {member.characters.map((character) => (
                      <div
                        className="min-w-0 rounded-lg border border-slate-200/90 bg-slate-50/80 p-4"
                        key={character.id}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {character.isMain ? (
                            <Badge tone="info">본캐</Badge>
                          ) : null}
                          <Badge tone="neutral">{character.serverName || "-"}</Badge>
                        </div>
                        <div className="mt-3">
                          <div className="text-base font-semibold text-slate-950">
                            {character.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {character.className}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-slate-700">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">아이템 레벨</span>
                            <span className="font-semibold text-slate-950">
                              {formatItemLevel(character.itemLevel)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">전투력</span>
                            <span className="font-semibold text-slate-950">
                              {formatCombatPower(character.combatPower)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          갱신: {formatSyncedAt(character.lastSyncedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionPanel>
            );
          })}
        </section>
      </div>
    </main>
  );
}
