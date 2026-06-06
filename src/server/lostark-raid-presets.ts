export type LostArkRaidPreset = {
  name: string;
  difficulty: string;
  gates: string;
  requiredPlayers: 4 | 8 | 16;
  supportSlots: 1 | 2 | 4;
  requirements: string;
  notes: string;
  legacyKeys?: Array<{ name: string; difficulty: string; gates: string }>;
};

const defaultRequirements =
  "아이템 레벨, 엘릭서/초월/보석, 숙련도 기준은 공대 운영에 맞게 조정하세요.";

const defaultNotes = "2026년 6월 기준 상시 레이드 프리셋입니다.";

function preset(
  input: Omit<LostArkRaidPreset, "requirements" | "notes"> &
    Partial<Pick<LostArkRaidPreset, "requirements" | "notes">>,
): LostArkRaidPreset {
  return {
    ...input,
    requirements: input.requirements ?? defaultRequirements,
    notes: input.notes ?? defaultNotes,
  };
}

export const LOSTARK_RAID_TEMPLATE_PRESETS: LostArkRaidPreset[] = [
  preset({
    name: "지평의 성당",
    difficulty: "1단계",
    gates: "1-2",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "지평의 성당",
    difficulty: "2단계",
    gates: "1-2",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "지평의 성당",
    difficulty: "3단계",
    gates: "1-2",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "그림자 레이드: 고통의 마녀 세르카",
    difficulty: "노말",
    gates: "1-2",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "그림자 레이드: 고통의 마녀 세르카",
    difficulty: "하드",
    gates: "1-2",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "그림자 레이드: 고통의 마녀 세르카",
    difficulty: "나이트메어",
    gates: "1-2",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "카제로스 서막: 붉어진 백야의 나선",
    difficulty: "노말",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [{ name: "에키드나", difficulty: "노말", gates: "1-2" }],
  }),
  preset({
    name: "카제로스 서막: 붉어진 백야의 나선",
    difficulty: "하드",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [{ name: "에키드나", difficulty: "하드", gates: "1-2" }],
  }),
  preset({
    name: "카제로스 1막: 대지를 부수는 업화의 궤적",
    difficulty: "노말",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [
      { name: "카제로스 1막: 에기르", difficulty: "노말", gates: "1-2" },
    ],
  }),
  preset({
    name: "카제로스 1막: 대지를 부수는 업화의 궤적",
    difficulty: "하드",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [
      { name: "카제로스 1막: 에기르", difficulty: "하드", gates: "1-2" },
    ],
  }),
  preset({
    name: "카제로스 2막: 부유하는 악몽의 진혼곡",
    difficulty: "노말",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [
      { name: "카제로스 2막: 아브렐슈드", difficulty: "노말", gates: "1-2" },
    ],
  }),
  preset({
    name: "카제로스 2막: 부유하는 악몽의 진혼곡",
    difficulty: "하드",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [
      { name: "카제로스 2막: 아브렐슈드", difficulty: "하드", gates: "1-2" },
    ],
  }),
  preset({
    name: "카제로스 2막: 아브렐슈드 익스트림",
    difficulty: "노말",
    gates: "1",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "카제로스 2막: 아브렐슈드 익스트림",
    difficulty: "하드",
    gates: "1",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "카제로스 2막: 아브렐슈드 익스트림",
    difficulty: "나이트메어",
    gates: "1",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "카제로스 3막: 칠흑, 폭풍의 밤",
    difficulty: "노말",
    gates: "1-3",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [
      { name: "카제로스 3막: 모르둠", difficulty: "노말", gates: "1-3" },
    ],
  }),
  preset({
    name: "카제로스 3막: 칠흑, 폭풍의 밤",
    difficulty: "하드",
    gates: "1-3",
    requiredPlayers: 8,
    supportSlots: 2,
    legacyKeys: [
      { name: "카제로스 3막: 모르둠", difficulty: "하드", gates: "1-3" },
    ],
  }),
  preset({
    name: "카제로스 4막: 파멸의 성채",
    difficulty: "노말",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "카제로스 4막: 파멸의 성채",
    difficulty: "하드",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "카제로스 종막: 최후의 날",
    difficulty: "노말",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "카제로스 종막: 최후의 날",
    difficulty: "하드",
    gates: "1-2",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "베히모스",
    difficulty: "노말",
    gates: "1-2",
    requiredPlayers: 16,
    supportSlots: 4,
  }),
  preset({
    name: "카멘",
    difficulty: "노말",
    gates: "1-3",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "카멘",
    difficulty: "하드",
    gates: "1-4",
    requiredPlayers: 8,
    supportSlots: 2,
  }),
  preset({
    name: "상아탑",
    difficulty: "노말",
    gates: "1-3",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "상아탑",
    difficulty: "하드",
    gates: "1-3",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "카양겔",
    difficulty: "노말",
    gates: "1-3",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
  preset({
    name: "카양겔",
    difficulty: "하드",
    gates: "1-3",
    requiredPlayers: 4,
    supportSlots: 1,
  }),
];
