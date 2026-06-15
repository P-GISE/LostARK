import { formatItemLevel } from "@/lib/character-display";
import { Badge, EmptyState, cx } from "@/components/ui";
import {
  getCharacterProgress,
  getProgress,
  getProgressBarClassName,
  getProgressTone,
  type ProgressView,
} from "@/components/homework/homework-progress";
import {
  getRaidGroups,
  getRaidVariantLabel,
} from "@/components/homework/homework-raid-groups";
import type { HomeworkMemberView } from "@/components/homework/homework-types";

function ProgressBar({ progress }: { readonly progress: ProgressView }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>진행률</span>
        <span>{progress.percent}%</span>
      </div>
      <div
        aria-hidden="true"
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width]",
            getProgressBarClassName(progress),
          )}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

export function HomeworkMemberCard({
  defaultOpen = false,
  isCurrentMember = false,
  member,
  setHomeworkAction,
}: {
  readonly defaultOpen?: boolean;
  readonly isCurrentMember?: boolean;
  readonly member: HomeworkMemberView;
  readonly setHomeworkAction?: (formData: FormData) => Promise<void>;
}) {
  const memberProgress = getProgress(member.completedCount, member.totalCount);
  const description =
    memberProgress.remainingCount === 0
      ? "남은 숙제가 없습니다."
      : `${memberProgress.remainingCount}개 남음`;

  return (
    <details
      aria-label={`${member.nickname} 숙제`}
      className="group min-w-0 rounded-lg border border-slate-200/90 bg-white shadow-sm shadow-slate-200/60"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 rounded-lg bg-slate-50/80 px-4 py-3 transition hover:bg-teal-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-100 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-950">
              {member.nickname}
            </h2>
            {isCurrentMember ? <Badge tone="info">내 숙제</Badge> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={getProgressTone(memberProgress)}>
            {member.completedCount}/{member.totalCount} 완료
          </Badge>
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-500 transition group-open:rotate-180"
          >
            v
          </span>
        </div>
      </summary>
      <div className="grid gap-4 border-t border-slate-100 p-4">
        <ProgressBar progress={memberProgress} />
        {member.characters.length === 0 ? (
          <EmptyState title="등록된 캐릭터가 없습니다." />
        ) : (
          <div className="grid gap-3">
            {member.characters.map((character) => {
              const characterProgress = getCharacterProgress(character);
              const raidGroups = getRaidGroups(character.raids);

              return (
                <article
                  className="rounded-md border border-slate-200 bg-slate-50/70 p-3"
                  key={character.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        {character.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {character.className} · Lv.{" "}
                        {formatItemLevel(character.itemLevel)}
                      </p>
                    </div>
                    <div className="self-start">
                      <Badge tone={getProgressTone(characterProgress)}>
                        {characterProgress.completedCount}/
                        {characterProgress.totalCount}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {raidGroups.map((raidGroup) => {
                      const completedVariant =
                        raidGroup.completedRaid === null
                          ? "미완료"
                          : `완료: ${getRaidVariantLabel(raidGroup.completedRaid)}`;

                      return (
                        <div
                          className={cx(
                            "rounded-md border px-3 py-2.5",
                            raidGroup.completedRaid
                              ? "border-emerald-200 bg-emerald-50/80"
                              : "border-slate-200 bg-white",
                          )}
                          key={raidGroup.name}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div
                                className={cx(
                                  "text-sm font-semibold leading-5",
                                  raidGroup.completedRaid
                                    ? "text-emerald-900"
                                    : "text-slate-900",
                                )}
                              >
                                {raidGroup.name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {completedVariant}
                              </div>
                            </div>
                            {raidGroup.raids.length > 1 ? (
                              <div className="self-start">
                                <Badge tone="info">
                                  {raidGroup.raids.length}개 난이도
                                </Badge>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {raidGroup.raids.map((raid) => {
                              const variantLabel = getRaidVariantLabel(raid);
                              const buttonLabel = `${raidGroup.name} · ${variantLabel} ${
                                raid.completed ? "완료 해제" : "완료 처리"
                              }`;

                              return (
                                <form
                                  action={setHomeworkAction}
                                  key={raid.raidTemplateId}
                                >
                                  <input
                                    name="characterId"
                                    type="hidden"
                                    value={character.id}
                                  />
                                  <input
                                    name="raidTemplateId"
                                    type="hidden"
                                    value={raid.raidTemplateId}
                                  />
                                  <input
                                    name="completed"
                                    type="hidden"
                                    value={raid.completed ? "false" : "true"}
                                  />
                                  <button
                                    aria-label={buttonLabel}
                                    className={cx(
                                      "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2",
                                      raid.completed
                                        ? "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-100"
                                        : "border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus-visible:ring-teal-100",
                                    )}
                                  >
                                    {variantLabel}
                                  </button>
                                </form>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}
