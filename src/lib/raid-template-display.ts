export type RaidTemplateDisplayInput = {
  difficulty: string;
  gates: string;
  name: string;
};

const difficultyOrder = new Map([
  ["노말", 0],
  ["하드", 1],
  ["나이트메어", 2],
]);

export function formatRaidTemplateGates(gates: string) {
  const trimmed = gates.trim();
  if (!trimmed) {
    return "관문 미정";
  }
  if (trimmed.includes("관문")) {
    return trimmed;
  }
  return `${trimmed}관문`;
}

export function splitRaidTemplateDifficulty(difficulty: string) {
  const trimmed = difficulty.trim();
  if (!trimmed) {
    return ["난이도 미정"];
  }
  if (trimmed.startsWith("익스트림 ")) {
    return ["익스트림", trimmed.replace(/^익스트림\s+/, "")];
  }
  return [trimmed];
}

export function formatRaidTemplateDifficulty(difficulty: string) {
  return splitRaidTemplateDifficulty(difficulty).join(" ");
}

export function formatRaidTemplateLabel(template: RaidTemplateDisplayInput) {
  return [
    template.name.trim(),
    formatRaidTemplateDifficulty(template.difficulty),
    formatRaidTemplateGates(template.gates),
  ].join(" · ");
}

function getDifficultyRank(difficulty: string) {
  const parts = splitRaidTemplateDifficulty(difficulty);
  const isExtreme = parts[0] === "익스트림";
  const baseDifficulty = isExtreme ? parts[1] : parts[0];
  return (isExtreme ? 10 : 0) + (difficultyOrder.get(baseDifficulty) ?? 99);
}

export function compareRaidTemplateDisplay(
  a: RaidTemplateDisplayInput,
  b: RaidTemplateDisplayInput,
) {
  const nameComparison = a.name.localeCompare(b.name, "ko");
  if (nameComparison !== 0) {
    return nameComparison;
  }

  const difficultyComparison =
    getDifficultyRank(a.difficulty) - getDifficultyRank(b.difficulty);
  if (difficultyComparison !== 0) {
    return difficultyComparison;
  }

  return formatRaidTemplateGates(a.gates).localeCompare(
    formatRaidTemplateGates(b.gates),
    "ko",
  );
}
