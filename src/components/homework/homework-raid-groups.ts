import {
  compareRaidTemplateDisplay,
  formatRaidTemplateGates,
} from "@/lib/raid-template-display";
import type { HomeworkRaidView } from "@/components/homework/homework-types";

export type HomeworkRaidGroupView = {
  readonly completedRaid: HomeworkRaidView | null;
  readonly name: string;
  readonly raids: readonly HomeworkRaidView[];
};

function getRaidGroupName(raid: HomeworkRaidView) {
  const trimmed = raid.raidTemplateName.trim();
  return trimmed.length === 0 ? "이름 없는 레이드" : trimmed;
}

function compareHomeworkRaids(a: HomeworkRaidView, b: HomeworkRaidView) {
  return compareRaidTemplateDisplay(
    {
      difficulty: a.difficulty,
      gates: a.gates,
      name: getRaidGroupName(a),
    },
    {
      difficulty: b.difficulty,
      gates: b.gates,
      name: getRaidGroupName(b),
    },
  );
}

function raidSortInput(group: HomeworkRaidGroupView) {
  const firstRaid = group.raids[0];
  if (!firstRaid) {
    return { difficulty: "", gates: "", name: group.name };
  }

  return {
    difficulty: firstRaid.difficulty,
    gates: firstRaid.gates,
    name: group.name,
  };
}

export function getRaidVariantLabel(raid: HomeworkRaidView) {
  return [raid.difficulty.trim(), formatRaidTemplateGates(raid.gates)].join(" · ");
}

export function getRaidGroups(raids: readonly HomeworkRaidView[]) {
  const groups = new Map<string, HomeworkRaidView[]>();

  for (const raid of raids) {
    const groupName = getRaidGroupName(raid);
    const existing = groups.get(groupName) ?? [];
    groups.set(groupName, [...existing, raid]);
  }

  return [...groups.entries()]
    .map(([name, groupRaids]) => {
      const raids = [...groupRaids].sort(compareHomeworkRaids);

      return {
        completedRaid: raids.find((raid) => raid.completed) ?? null,
        name,
        raids,
      };
    })
    .sort((a, b) =>
      compareRaidTemplateDisplay(raidSortInput(a), raidSortInput(b)),
    );
}
