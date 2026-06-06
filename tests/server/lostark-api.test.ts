import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchLostArkCharacterProfile,
  fetchLostArkSiblingCharacters,
  parseLostArkNumber,
} from "@/server/lostark-api";

describe("lostark api client", () => {
  beforeEach(() => {
    vi.stubEnv("LOSTARK_OPEN_API_JWT", "jwt-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses formatted numeric strings", () => {
    expect(parseLostArkNumber("1,773.33")).toBe(1773.33);
    expect(parseLostArkNumber("6,127")).toBe(6127);
    expect(parseLostArkNumber(6127)).toBe(6127);
    expect(() => parseLostArkNumber("")).toThrow(
      "로스트아크 캐릭터 수치를 해석하지 못했습니다",
    );
    expect(() => parseLostArkNumber(undefined)).toThrow(
      "로스트아크 캐릭터 수치를 해석하지 못했습니다",
    );
    expect(() => parseLostArkNumber(Number.NaN)).toThrow(
      "로스트아크 캐릭터 수치를 해석하지 못했습니다",
    );
  });

  it("fetches sibling characters with bearer authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          ServerName: "루페온",
          CharacterName: "본캐",
          CharacterClassName: "바드",
          ItemAvgLevel: "1,773.33",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const siblings = await fetchLostArkSiblingCharacters("본캐");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://developer-lostark.game.onstove.com/characters/%EB%B3%B8%EC%BA%90/siblings",
      {
        headers: {
          accept: "application/json",
          authorization: "bearer jwt-token",
        },
      },
    );
    expect(siblings).toEqual([
      {
        serverName: "루페온",
        characterName: "본캐",
        className: "바드",
        itemLevel: 1773.33,
      },
    ]);
  });

  it("fetches profile combat power", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ServerName: "루페온",
          CharacterName: "본캐",
          CharacterClassName: "바드",
          ItemAvgLevel: "1,773.33",
          CombatPower: "6,127",
        }),
      }),
    );

    await expect(fetchLostArkCharacterProfile("본캐")).resolves.toEqual({
      serverName: "루페온",
      characterName: "본캐",
      className: "바드",
      itemLevel: 1773.33,
      combatPower: 6127,
    });
  });

  it("throws a Korean error when the API key is missing", async () => {
    vi.stubEnv("LOSTARK_OPEN_API_JWT", "");

    await expect(fetchLostArkSiblingCharacters("본캐")).rejects.toThrow(
      "로스트아크 OpenAPI 키가 설정되어 있지 않습니다",
    );
  });

  it("maps rate limit responses to a Korean error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      }),
    );

    await expect(fetchLostArkSiblingCharacters("본캐")).rejects.toThrow(
      "로스트아크 OpenAPI 호출 제한에 도달했습니다",
    );
  });

  it("maps fetch failures to a Korean API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network unavailable")),
    );

    await expect(fetchLostArkSiblingCharacters("본캐")).rejects.toThrow(
      "로스트아크 OpenAPI 응답을 가져오지 못했습니다",
    );
  });

  it("maps invalid JSON responses to a Korean API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("invalid json");
        },
      }),
    );

    await expect(fetchLostArkSiblingCharacters("본캐")).rejects.toThrow(
      "로스트아크 OpenAPI 응답을 가져오지 못했습니다",
    );
  });

  it("maps malformed sibling response bodies to a Korean API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [null],
      }),
    );

    await expect(fetchLostArkSiblingCharacters("본캐")).rejects.toThrow(
      "로스트아크 캐릭터 정보가 올바르지 않습니다",
    );
  });

  it("maps malformed profile response bodies to a Korean API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      }),
    );

    await expect(fetchLostArkCharacterProfile("본캐")).rejects.toThrow(
      "로스트아크 캐릭터 정보가 올바르지 않습니다",
    );
  });
});
