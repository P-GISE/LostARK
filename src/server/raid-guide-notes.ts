type RaidGuide = {
  preparation: string[];
  sidereal?: string[];
  attributeCard: string[];
};

type RaidGuideKey =
  | "prologue"
  | "act1"
  | "act2"
  | "act3"
  | "act4"
  | "finale"
  | "serka"
  | "horizon"
  | "kayangel"
  | "ivorytower";

const RAID_GUIDES: Record<RaidGuideKey, RaidGuide> = {
  prologue: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 / 성부",
      "2관: 물약 / 아드 or 각물 / 암수 / 수면폭탄",
    ],
    sidereal: [
      "1관: 아제나(딜), 아델(딜)",
      "2관: 에페르니아, 라하르트(둘 다 히든)",
    ],
    attributeCard: ["딜러: 세구빛", "서폿: 남바절"],
  },
  act1: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 / 성부",
      "2관: 물약 / 아드 or 각물 / 암수 / 성부",
    ],
    sidereal: [
      "1관: 웨이(무력), 라하르트(무력)",
      "2관: 에아달린(심장 부수기, 히든) / 아델(벽 부수기, 딜) / 하드 발악 시 웨이",
    ],
    attributeCard: ["딜러: 세구빛", "서폿: 남바절"],
  },
  act2: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 (서폿 부식) / 불꽃 스크롤",
      "2관: 물약 / 아드 or 각물 / 암수 / 성부 (2관만 빛성부)",
    ],
    sidereal: [
      "1관: 페데리코, 온도 관리가 안 되면 에페르니아 가능하지만 딜 부족 주의",
      "2관: 니나브(MZ 택틱) / 하드 2-3 아제나(히든)",
    ],
    attributeCard: [
      "추천 속성: 뇌구빛",
      "딜러: 알고보면 / 뇌구빛(숨결)",
      "서폿: 너는 계획이 다 있구나 / 뇌구빛(가호)",
    ],
  },
  act3: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 / 성부",
      "2관: 물약 / 아드 or 각물 / 암수 / 성부",
      "3관: 물약 / 아드 or 각물 / 암수 (서폿 1명 부식) / 성부",
    ],
    sidereal: [
      "1관: 실리안(딜), 아자키엘(피면), 카마인(히든)",
      "2관: 니나브(딜), 미스틱(히든)",
      "3관: 바훈투르(파괴), 샨디(빠른 밀기), 바스티안(게이지 관리)",
    ],
    attributeCard: [
      "기본: 딜러 세구빛 / 서폿 남바절",
      "3관만 토구빛",
      "딜러: 알고보면 / 토구빛(숨결)",
      "서폿: 너는 계획이 다 있구나 / 토바절(가호) / 대사부(하위)",
    ],
  },
  act4: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 / 성부",
      "2관: 물약 / 아드 or 각물 / 암수 (무력 부족 시 회수) / 성부",
    ],
    sidereal: [
      "1관: 니나브 / 실리안 / 웨이 (150줄 니나브 제외 자유)",
      "2관: 바훈투르(무력, 히든) / 실리안(파괴) / 아제나(딜)",
    ],
    attributeCard: [
      "기본: 딜러 세구빛 / 서폿 남바절",
      "2관만 화구빛",
      "딜러: 알고보면 / 화구빛(숨결)",
      "서폿: 너는 계획이 다 있구나 / 화구빛(가호)",
    ],
  },
  finale: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 / 성부",
      "2관: 물약 / 아드 or 각물 / 암수 / 빛나는 성스러운 폭탄",
      "2-2관: 물약 / 아드 or 각물 or 시정 / 암수 (상황 따라 회수) / 빛나는 성스러운 폭탄",
    ],
    sidereal: [
      "1관: 니나브(쉴드 추가 피해), 웨이(히든)",
      "2관: 카단(히든), 샨디(딜+2타 시 쿨감), 이난나(피면)",
      "2-2관: 공아만 / 방아만 (히든 있음)",
    ],
    attributeCard: ["딜러: 세구빛", "서폿: 남바절"],
  },
  serka: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 / 성부",
      "2관: 물약 / 아드 or 각물 / 암수 or 파폭 (서폿 부식) / 성부",
    ],
    attributeCard: ["딜러: 세구빛", "서폿: 남바절"],
  },
  horizon: {
    preparation: [
      "1관: 물약 / 아드 or 각물 / 암수 / 성부",
      "2관: 물약 / 아드 or 각물 / 파폭 (서폿 부식) / 성부",
    ],
    attributeCard: [
      "추천 속성: 암구빛",
      "딜러: 알고보면 / 암구빛(숨결)",
      "서폿: 너는 계획이 다 있구나 / 암구빛(가호)",
    ],
  },
  kayangel: {
    preparation: [],
    attributeCard: [
      "기본: 딜러 세구빛 / 서폿 남바절",
      "3관만 암구빛",
      "딜러: 알고보면 / 암구빛(숨결)",
      "서폿: 너는 계획이 다 있구나 / 암구빛(가호)",
    ],
  },
  ivorytower: {
    preparation: [],
    attributeCard: ["딜러: 세구빛", "서폿: 남바절"],
  },
};

const RAID_GUIDE_MATCHERS: Array<{
  key: RaidGuideKey;
  keywords: string[];
}> = [
  { key: "horizon", keywords: ["지평"] },
  { key: "serka", keywords: ["세르카"] },
  { key: "prologue", keywords: ["서막"] },
  { key: "act1", keywords: ["1막"] },
  { key: "act2", keywords: ["2막", "아브렐슈드 익스트림"] },
  { key: "act3", keywords: ["3막"] },
  { key: "act4", keywords: ["4막"] },
  { key: "finale", keywords: ["종막"] },
  { key: "kayangel", keywords: ["카양겔"] },
  { key: "ivorytower", keywords: ["상아탑"] },
];

function findRaidGuide(templateName: string) {
  const matcher = RAID_GUIDE_MATCHERS.find(({ keywords }) =>
    keywords.some((keyword) => templateName.includes(keyword)),
  );

  return matcher ? RAID_GUIDES[matcher.key] : null;
}

function formatSection(title: string, lines: string[]) {
  if (lines.length === 0) {
    return null;
  }

  return [title, ...lines.map((line) => `- ${line}`)].join("\n");
}

export function buildRaidGuideNotes(template: { name: string }) {
  const guide = findRaidGuide(template.name);
  if (!guide) {
    return "";
  }

  return [
    formatSection("준비물", guide.preparation),
    formatSection("공대장 스킬", guide.sidereal ?? []),
    formatSection("카드", guide.attributeCard),
  ]
    .filter(Boolean)
    .join("\n\n");
}
