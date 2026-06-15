import type {
  HomeworkCharacterView,
  HomeworkMemberView,
} from "@/components/homework/homework-types";
import { getRaidGroups } from "@/components/homework/homework-raid-groups";

export type ProgressView = {
  readonly completedCount: number;
  readonly percent: number;
  readonly remainingCount: number;
  readonly totalCount: number;
};

export type ProgressTone = "neutral" | "success" | "warning" | "info";

export function getProgress(
  completedCount: number,
  totalCount: number,
): ProgressView {
  const percent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    completedCount,
    percent,
    remainingCount: totalCount - completedCount,
    totalCount,
  };
}

export function getBoardProgress(members: readonly HomeworkMemberView[]) {
  const completedCount = members.reduce(
    (total, member) => total + member.completedCount,
    0,
  );
  const totalCount = members.reduce(
    (total, member) => total + member.totalCount,
    0,
  );
  const completedMemberCount = members.filter(
    (member) => member.totalCount > 0 && member.completedCount === member.totalCount,
  ).length;

  return {
    completedMemberCount,
    ...getProgress(completedCount, totalCount),
  };
}

export function getCharacterProgress(character: HomeworkCharacterView) {
  const raidGroups = getRaidGroups(character.raids);

  return getProgress(
    raidGroups.filter((group) => group.completedRaid !== null).length,
    raidGroups.length,
  );
}

export function getProgressTone(progress: ProgressView): ProgressTone {
  if (progress.totalCount === 0) {
    return "neutral";
  }
  if (progress.completedCount === progress.totalCount) {
    return "success";
  }
  if (progress.completedCount === 0) {
    return "warning";
  }
  return "info";
}

export function getProgressBarClassName(progress: ProgressView) {
  if (progress.totalCount === 0) {
    return "bg-slate-300";
  }
  if (progress.completedCount === progress.totalCount) {
    return "bg-emerald-500";
  }
  return "bg-teal-600";
}
