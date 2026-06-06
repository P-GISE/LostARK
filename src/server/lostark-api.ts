const LOSTARK_API_BASE_URL = "https://developer-lostark.game.onstove.com";
const LOSTARK_API_RESPONSE_ERROR =
  "로스트아크 OpenAPI 응답을 가져오지 못했습니다";
const LOSTARK_CHARACTER_INFO_ERROR =
  "로스트아크 캐릭터 정보가 올바르지 않습니다";

export type LostArkSiblingCharacter = {
  serverName: string;
  characterName: string;
  className: string;
  itemLevel: number;
};

export type LostArkCharacterProfile = LostArkSiblingCharacter & {
  combatPower: number | null;
};

type RawSibling = {
  ServerName?: string;
  CharacterName?: string;
  CharacterClassName?: string;
  ItemAvgLevel?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrimmedString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function getLostArkNumberValue(
  record: Record<string, unknown>,
  key: string,
) {
  const value = record[key];
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(LOSTARK_CHARACTER_INFO_ERROR);
  }
  return value;
}

export function parseLostArkNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("로스트아크 캐릭터 수치를 해석하지 못했습니다");
    }
    return value;
  }

  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  if (!normalized) {
    throw new Error("로스트아크 캐릭터 수치를 해석하지 못했습니다");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error("로스트아크 캐릭터 수치를 해석하지 못했습니다");
  }
  return parsed;
}

export function isLostArkCharacterInfoError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === LOSTARK_CHARACTER_INFO_ERROR
  );
}

function getApiToken() {
  const token = process.env.LOSTARK_OPEN_API_JWT?.trim();
  if (!token) {
    throw new Error("로스트아크 OpenAPI 키가 설정되어 있지 않습니다");
  }
  return token;
}

async function fetchJson(path: string) {
  const token = getApiToken();
  let response: Response;

  try {
    response = await fetch(`${LOSTARK_API_BASE_URL}${path}`, {
      headers: {
        accept: "application/json",
        authorization: `bearer ${token}`,
      },
    });
  } catch {
    throw new Error(LOSTARK_API_RESPONSE_ERROR);
  }

  if (response.status === 401) {
    throw new Error("로스트아크 OpenAPI 인증에 실패했습니다");
  }
  if (response.status === 404) {
    throw new Error("로스트아크 캐릭터를 찾을 수 없습니다");
  }
  if (response.status === 429) {
    throw new Error("로스트아크 OpenAPI 호출 제한에 도달했습니다");
  }
  if (!response.ok) {
    throw new Error(LOSTARK_API_RESPONSE_ERROR);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(LOSTARK_API_RESPONSE_ERROR);
  }
}

function normalizeSibling(raw: unknown): LostArkSiblingCharacter {
  if (!isRecord(raw)) {
    throw new Error(LOSTARK_CHARACTER_INFO_ERROR);
  }

  const serverName = getTrimmedString(raw, "ServerName");
  const characterName = getTrimmedString(raw, "CharacterName");
  const className = getTrimmedString(raw, "CharacterClassName");
  if (!serverName || !characterName || !className) {
    throw new Error(LOSTARK_CHARACTER_INFO_ERROR);
  }

  return {
    serverName,
    characterName,
    className,
    itemLevel: parseLostArkNumber(getLostArkNumberValue(raw, "ItemAvgLevel")),
  };
}

export async function fetchLostArkSiblingCharacters(characterName: string) {
  const trimmed = characterName.trim();
  if (!trimmed) {
    throw new Error("본캐 캐릭터명을 입력해 주세요");
  }

  const json = (await fetchJson(
    `/characters/${encodeURIComponent(trimmed)}/siblings`,
  )) as RawSibling[];

  if (!Array.isArray(json) || json.length === 0) {
    throw new Error("같은 계정의 로스트아크 캐릭터를 찾지 못했습니다");
  }

  return json.map(normalizeSibling);
}

export async function fetchLostArkCharacterProfile(characterName: string) {
  const trimmed = characterName.trim();
  if (!trimmed) {
    throw new Error("캐릭터명을 입력해 주세요");
  }

  const json = (await fetchJson(
    `/armories/characters/${encodeURIComponent(trimmed)}/profiles`,
  )) as unknown;
  if (!isRecord(json)) {
    throw new Error(LOSTARK_CHARACTER_INFO_ERROR);
  }
  const sibling = normalizeSibling(json);
  const combatPower = json.CombatPower;

  return {
    ...sibling,
    combatPower:
      combatPower == null
        ? null
        : Math.round(parseLostArkNumber(getLostArkNumberValue(json, "CombatPower"))),
  };
}
