import Link from "next/link";
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
  cx,
  pageShellClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { formatCombatPower, formatItemLevel } from "@/lib/character-display";
import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import {
  compareRaidTemplateDisplay,
  formatRaidTemplateLabel,
} from "@/lib/raid-template-display";
import {
  listCharacterRaidChecksForGroup,
  setCharacterRaidCheck,
} from "@/server/character-raid-checks";
import { syncLostArkCharactersForMember } from "@/server/character-sync";
import { requireCurrentMember } from "@/server/auth-context";
import { createCharacter } from "@/server/characters";
import { listMembers } from "@/server/members";
import { listRaidTemplates } from "@/server/raid-templates";

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

type RaidTemplateForChecklist = Awaited<
  ReturnType<typeof listRaidTemplates>
>[number];

function raidCheckKey(characterId: string, raidTemplateId: string) {
  return `${characterId}:${raidTemplateId}`;
}

function templateBossName(template: RaidTemplateForChecklist) {
  return template.name.trim() || "이름 미정";
}

function groupRaidTemplatesByBossName(templates: RaidTemplateForChecklist[]) {
  const groups = new Map<
    string,
    { name: string; templates: RaidTemplateForChecklist[] }
  >();

  for (const template of templates) {
    const name = templateBossName(template);
    const group = groups.get(name);
    if (group) {
      group.templates.push(template);
    } else {
      groups.set(name, { name, templates: [template] });
    }
  }

  return Array.from(groups.values());
}

function isBossGroupCompleted(input: {
  characterId: string;
  completedKeys: Set<string>;
  templates: RaidTemplateForChecklist[];
}) {
  return input.templates.some((template) =>
    input.completedKeys.has(raidCheckKey(input.characterId, template.id)),
  );
}

function scheduleTemplateLink(templateId: string) {
  return `/schedules?templateId=${encodeURIComponent(templateId)}`;
}

type MemberForChecklist = Awaited<ReturnType<typeof listMembers>>[number];
type BossTemplateGroup = {
  name: string;
  templates: RaidTemplateForChecklist[];
};

function characterLabel(input: {
  characterName: string;
  memberNickname: string;
}) {
  return input.characterName || input.memberNickname;
}

function compactNamePreview(names: string[]) {
  if (names.length === 0) {
    return "";
  }

  const preview = names.slice(0, 4).join(", ");
  const hiddenCount = names.length - 4;
  return hiddenCount > 0 ? `${preview} 외 ${hiddenCount}명` : preview;
}

function NameSummary({
  emptyLabel = "-",
  names,
}: {
  emptyLabel?: string;
  names: string[];
}) {
  if (names.length === 0) {
    return <span className="text-slate-400">{emptyLabel}</span>;
  }

  return (
    <div className="grid gap-1" title={names.join(", ")}>
      <span className="font-semibold">{names.length}명</span>
      <span className="max-w-72 truncate text-xs text-slate-500">
        {compactNamePreview(names)}
      </span>
    </div>
  );
}

function BossChecklistMatrix({
  bossGroups,
  completedKeys,
  members,
}: {
  bossGroups: BossTemplateGroup[];
  completedKeys: Set<string>;
  members: MemberForChecklist[];
}) {
  const characters = members.flatMap((member) =>
    member.characters.map((character) => ({
      character,
      label: characterLabel({
        characterName: character.name,
        memberNickname: member.nickname,
      }),
    })),
  );

  if (bossGroups.length === 0 || characters.length === 0) {
    return null;
  }

  return (
    <SectionPanel
      description="보스별로 이번 주 완료 캐릭터와 남은 캐릭터를 한눈에 확인합니다."
      title="이번 주 보스 현황"
    >
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table
          aria-label="보스 체크 매트릭스"
          className="w-max min-w-full border-collapse text-sm"
        >
          <thead className="bg-slate-100 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="min-w-36 border-b border-slate-200 px-3 py-2">
                보스
              </th>
              <th className="min-w-40 border-b border-slate-200 px-3 py-2">
                완료
              </th>
              <th className="min-w-48 border-b border-slate-200 px-3 py-2">
                남은 캐릭터
              </th>
            </tr>
          </thead>
          <tbody>
            {bossGroups.map((group) => {
              const completedCharacters = characters.filter(({ character }) =>
                isBossGroupCompleted({
                  characterId: character.id,
                  completedKeys,
                  templates: group.templates,
                }),
              );
              const remainingCharacters = characters.filter(
                ({ character }) =>
                  !isBossGroupCompleted({
                    characterId: character.id,
                    completedKeys,
                    templates: group.templates,
                  }),
              );

              return (
                <tr
                  className="align-top odd:bg-white even:bg-slate-50/70"
                  key={group.name}
                >
                  <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-900">
                    {group.name}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-emerald-800">
                    {completedCharacters.length}/{characters.length}
                    <NameSummary
                      names={completedCharacters.map((row) => row.label)}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    <NameSummary
                      emptyLabel="없음"
                      names={remainingCharacters.map((row) => row.label)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  );
}

function canEditCharacterChecklist(input: {
  currentMemberId: string;
  currentMemberRole: string;
  ownerMemberId: string;
}) {
  return (
    input.currentMemberRole === "LEADER" ||
    input.currentMemberId === input.ownerMemberId
  );
}

function CharacterRaidChecklist({
  action,
  canEdit,
  canCreateSchedule,
  characterId,
  completedKeys,
  showRemainingOnly,
  templates,
  weekStartDate,
}: {
  action: (formData: FormData) => Promise<void>;
  canEdit: boolean;
  canCreateSchedule: boolean;
  characterId: string;
  completedKeys: Set<string>;
  showRemainingOnly: boolean;
  templates: RaidTemplateForChecklist[];
  weekStartDate: string;
}) {
  const bossGroups = groupRaidTemplatesByBossName(templates);
  const visibleBossGroups = showRemainingOnly
    ? bossGroups.filter(
        (group) =>
          !isBossGroupCompleted({
            characterId,
            completedKeys,
            templates: group.templates,
          }),
      )
    : bossGroups;
  const completedCount = bossGroups.filter((group) =>
    isBossGroupCompleted({
      characterId,
      completedKeys,
      templates: group.templates,
    }),
  ).length;
  const allTemplatesCompleted =
    bossGroups.length > 0 && completedCount === bossGroups.length;

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">
          이번 주 보스 체크
        </div>
        <Badge tone={allTemplatesCompleted ? "success" : "neutral"}>
          {completedCount}/{bossGroups.length} 완료
        </Badge>
      </div>
      {bossGroups.length === 0 ? (
        <div className="mt-3 text-xs text-slate-500">
          등록된 레이드 템플릿이 없습니다.
        </div>
      ) : visibleBossGroups.length === 0 ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          남은 보스가 없습니다.
        </div>
      ) : (
        <div className="mt-3 grid max-h-64 gap-3 overflow-y-auto pr-1">
          {visibleBossGroups.map((group) => {
            const groupCompleted = isBossGroupCompleted({
              characterId,
              completedKeys,
              templates: group.templates,
            });

            return (
              <div
                className="grid gap-2 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0"
                key={group.name}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-xs font-semibold text-slate-800">
                    {group.name}
                  </div>
                  <span
                    className={cx(
                      "shrink-0 text-[11px] font-semibold",
                      groupCompleted ? "text-emerald-700" : "text-slate-500",
                    )}
                  >
                    {groupCompleted ? "완료" : "미완료"}
                  </span>
                </div>
                <div className="grid gap-1.5">
                  {group.templates.map((template) => {
                    const label = formatRaidTemplateLabel(template);
                    const completed = completedKeys.has(
                      raidCheckKey(characterId, template.id),
                    );
                    const actionLabel = completed ? "완료 해제" : "완료 처리";
                    const buttonClassName = cx(
                      "flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-medium transition",
                      completed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900",
                    );

                    if (!canEdit) {
                      return (
                        <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]" key={template.id}>
                          <div
                            aria-label={`${label} ${completed ? "완료" : "미완료"}`}
                            className={buttonClassName}
                          >
                            <span className="min-w-0 truncate">{label}</span>
                            <span className="shrink-0 text-[11px] font-semibold">
                              {completed ? "완료" : "미완료"}
                            </span>
                          </div>
                          {canCreateSchedule && !groupCompleted && !completed ? (
                            <Link
                              aria-label={`${label} 일정 만들기`}
                              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50"
                              href={scheduleTemplateLink(template.id)}
                            >
                              일정 만들기
                            </Link>
                          ) : null}
                        </div>
                      );
                    }

                    return (
                      <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]" key={template.id}>
                        <form action={action}>
                          <input
                            name="characterId"
                            type="hidden"
                            value={characterId}
                          />
                          <input
                            name="raidTemplateId"
                            type="hidden"
                            value={template.id}
                          />
                          <input
                            name="weekStartDate"
                            type="hidden"
                            value={weekStartDate}
                          />
                          <input
                            name="completed"
                            type="hidden"
                            value={String(!completed)}
                          />
                          <button
                            aria-label={`${label} ${actionLabel}`}
                            className={buttonClassName}
                            type="submit"
                          >
                            <span className="min-w-0 truncate">{label}</span>
                            <span className="shrink-0 text-[11px] font-semibold">
                              {completed ? "완료" : "미완료"}
                            </span>
                          </button>
                        </form>
                        {canCreateSchedule && !groupCompleted && !completed ? (
                          <Link
                            aria-label={`${label} 일정 만들기`}
                            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50"
                            href={scheduleTemplateLink(template.id)}
                          >
                            일정 만들기
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ checklist?: string }>;
} = {}) {
  const params = await searchParams;
  const showRemainingOnly = params?.checklist === "remaining";
  const currentMember = await requireCurrentMember({ loginRedirectPath: "/members" });
  const weekStartDate = getLostArkWeekStartDate();
  const [members, raidTemplates, raidChecks] = await Promise.all([
    listMembers(currentMember.groupId),
    listRaidTemplates(currentMember.groupId),
    listCharacterRaidChecksForGroup({
      groupId: currentMember.groupId,
      weekStartDate,
    }),
  ]);
  const checklistTemplates = [...raidTemplates].sort(compareRaidTemplateDisplay);
  const bossGroups = groupRaidTemplatesByBossName(checklistTemplates);
  const completedKeys = new Set(
    raidChecks.map((check) =>
      raidCheckKey(check.characterId, check.raidTemplateId),
    ),
  );

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

  async function toggleRaidCheck(formData: FormData) {
    "use server";
    const member = await requireCurrentMember();
    await setCharacterRaidCheck({
      actorMemberId: member.id,
      characterId: String(formData.get("characterId") ?? ""),
      completed: String(formData.get("completed") ?? "") === "true",
      raidTemplateId: String(formData.get("raidTemplateId") ?? ""),
      weekStartDate: String(formData.get("weekStartDate") ?? ""),
    });
    revalidatePath("/members");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        action={
          <Link
            className={secondaryButtonClassName}
            href={showRemainingOnly ? "/members" : "/members?checklist=remaining"}
          >
            {showRemainingOnly ? "전체 보기" : "남은 보스만 보기"}
          </Link>
        }
        description="본캐 기준으로 같은 서버의 모든 캐릭터, 아이템 레벨, 전투력을 로스트아크 OpenAPI에서 동기화합니다."
        eyebrow="공대 관리"
        title="공대원"
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
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
          <BossChecklistMatrix
            bossGroups={bossGroups}
            completedKeys={completedKeys}
            members={members}
          />
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
                        <CharacterRaidChecklist
                          action={toggleRaidCheck}
                          canEdit={canEditCharacterChecklist({
                            currentMemberId: currentMember.id,
                            currentMemberRole: currentMember.role,
                            ownerMemberId: member.id,
                          })}
                          canCreateSchedule={currentMember.role === "LEADER"}
                          characterId={character.id}
                          completedKeys={completedKeys}
                          showRemainingOnly={showRemainingOnly}
                          templates={checklistTemplates}
                          weekStartDate={weekStartDate}
                        />
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
