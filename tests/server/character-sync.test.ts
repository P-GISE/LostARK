import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createCharacter, listCharactersForMember } from "@/server/characters";
import {
  syncLostArkCharactersForMember,
  syncLostArkCharactersForMembersWithMainCharacters,
} from "@/server/character-sync";

type LostArkFixture = Record<string, unknown>;

function mockLostArkFetch(overrides: LostArkFixture = {}) {
  const responses = new Map<string, unknown>(
    Object.entries({
      "/characters/%EB%B3%B8%EC%BA%90/siblings": [
        {
          ServerName: "루페온",
          CharacterName: "본캐",
          CharacterClassName: "바드",
          ItemAvgLevel: "1,773.33",
        },
        {
          ServerName: "루페온",
          CharacterName: "부캐",
          CharacterClassName: "브레이커",
          ItemAvgLevel: "1,720.00",
        },
        {
          ServerName: "카마인",
          CharacterName: "다른서버",
          CharacterClassName: "소서리스",
          ItemAvgLevel: "1,700.00",
        },
      ],
      "/armories/characters/%EB%B3%B8%EC%BA%90/profiles": {
        ServerName: "루페온",
        CharacterName: "본캐",
        CharacterClassName: "바드",
        ItemAvgLevel: "1,773.33",
        CombatPower: "6,127",
      },
      "/armories/characters/%EB%B6%80%EC%BA%90/profiles": {
        ServerName: "루페온",
        CharacterName: "부캐",
        CharacterClassName: "브레이커",
        ItemAvgLevel: "1,720.00",
        CombatPower: "5,900",
      },
      ...overrides,
    }),
  );

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (!responses.has(path)) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => responses.get(path) };
    }),
  );
}

describe("character sync", () => {
  beforeEach(() => {
    vi.stubEnv("LOSTARK_OPEN_API_JWT", "jwt-token");
    mockLostArkFetch();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("imports same-server siblings and marks the submitted character as main", async () => {
    const group = await createGroup({ name: "Sync Group" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "동기화",
    });

    const result = await syncLostArkCharactersForMember({
      memberId: member.id,
      mainCharacterName: "본캐",
      now: new Date("2026-06-05T12:00:00+09:00"),
    });
    const characters = await listCharactersForMember(member.id);

    expect(result).toEqual({
      importedCount: 2,
      updatedCount: 0,
      skippedOtherServerCount: 1,
      serverName: "루페온",
    });
    expect(characters.map((character) => character.name)).toEqual(["본캐", "부캐"]);
    expect(characters[0]).toMatchObject({
      className: "바드",
      serverName: "루페온",
      itemLevel: 1773.33,
      combatPower: 6127,
      isMain: true,
    });
    expect(characters[1].isMain).toBe(false);
  });

  it("updates existing local characters without creating duplicates", async () => {
    const group = await createGroup({ name: "Sync Existing" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "업데이트",
    });
    await createCharacter({
      memberId: member.id,
      name: "부캐",
      className: "옛직업",
      serverName: "루페온",
      itemLevel: 1600,
      combatPower: 1000,
      isMain: true,
      preferredRole: "DPS",
      notes: "보존",
    });

    const result = await syncLostArkCharactersForMember({
      memberId: member.id,
      mainCharacterName: "본캐",
      now: new Date("2026-06-05T12:00:00+09:00"),
    });
    const characters = await listCharactersForMember(member.id);

    expect(result.updatedCount).toBe(1);
    expect(characters).toHaveLength(2);
    expect(characters.find((character) => character.name === "부캐")).toMatchObject({
      className: "브레이커",
      itemLevel: 1720,
      combatPower: 5900,
      isMain: false,
      notes: "보존",
    });
  });

  it("imports same-server siblings when an optional profile response is missing", async () => {
    mockLostArkFetch({
      "/armories/characters/%EB%B6%80%EC%BA%90/profiles": null,
    });
    const group = await createGroup({ name: "Sync Missing Profile" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "MissingProfile",
    });

    const result = await syncLostArkCharactersForMember({
      memberId: member.id,
      mainCharacterName: "\uBCF8\uCE90",
      now: new Date("2026-06-05T12:00:00+09:00"),
    });
    const characters = await listCharactersForMember(member.id);

    expect(result).toMatchObject({
      importedCount: 2,
      updatedCount: 0,
      skippedOtherServerCount: 1,
    });
    expect(characters.find((character) => character.itemLevel === 1720)).toMatchObject({
      itemLevel: 1720,
      combatPower: null,
      isMain: false,
    });
  });

  it("updates a blank-server manual character instead of duplicating it", async () => {
    const group = await createGroup({ name: "Sync Blank Server" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "수동본캐",
    });
    await createCharacter({
      memberId: member.id,
      name: "본캐",
      className: "옛직업",
      itemLevel: 1600,
      preferredRole: "DPS",
      notes: "수동 보존",
    });

    const result = await syncLostArkCharactersForMember({
      memberId: member.id,
      mainCharacterName: "본캐",
      now: new Date("2026-06-05T12:00:00+09:00"),
    });
    const characters = await listCharactersForMember(member.id);

    expect(result.updatedCount).toBe(1);
    expect(result.importedCount).toBe(1);
    expect(characters.filter((character) => character.name === "본캐")).toHaveLength(1);
    expect(characters.find((character) => character.name === "본캐")).toMatchObject({
      className: "바드",
      serverName: "루페온",
      itemLevel: 1773.33,
      combatPower: 6127,
      isMain: true,
      notes: "수동 보존",
    });
  });

  it("does not modify local data when a same-server profile resolves to another server", async () => {
    mockLostArkFetch({
      "/armories/characters/%EB%B6%80%EC%BA%90/profiles": {
        ServerName: "카마인",
        CharacterName: "부캐",
        CharacterClassName: "브레이커",
        ItemAvgLevel: "1,720.00",
        CombatPower: "5,900",
      },
    });
    const group = await createGroup({ name: "Sync Server Mismatch" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "서버검증",
    });
    await createCharacter({
      memberId: member.id,
      name: "기존",
      className: "바드",
      itemLevel: 1700,
      preferredRole: "SUPPORT",
      notes: "",
    });

    await expect(
      syncLostArkCharactersForMember({
        memberId: member.id,
        mainCharacterName: "본캐",
      }),
    ).rejects.toThrow("같은 서버 캐릭터만 동기화할 수 있습니다");

    await expect(db.character.count({ where: { memberId: member.id } })).resolves.toBe(1);
  });

  it("does not modify local data when the official API fails", async () => {
    const group = await createGroup({ name: "Sync Failure" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "실패",
    });
    await createCharacter({
      memberId: member.id,
      name: "기존",
      className: "바드",
      itemLevel: 1700,
      preferredRole: "SUPPORT",
      notes: "",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    );

    await expect(
      syncLostArkCharactersForMember({
        memberId: member.id,
        mainCharacterName: "본캐",
      }),
    ).rejects.toThrow("로스트아크 OpenAPI 호출 제한에 도달했습니다");

    await expect(db.character.count({ where: { memberId: member.id } })).resolves.toBe(1);
  });

  it("refreshes members that already have a synced main character", async () => {
    const group = await createGroup({ name: "Auto Sync Group" });
    const syncedMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "자동동기화",
    });
    const manualOnlyMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "본캐없음",
    });
    await createCharacter({
      memberId: syncedMember.id,
      name: "본캐",
      className: "예전직업",
      itemLevel: 1600,
      preferredRole: "DPS",
      notes: "",
      serverName: "루페온",
      isMain: true,
    });
    await createCharacter({
      memberId: manualOnlyMember.id,
      name: "수동캐릭터",
      className: "바드",
      itemLevel: 1600,
      preferredRole: "SUPPORT",
      notes: "",
      serverName: "루페온",
      isMain: false,
    });

    const result = await syncLostArkCharactersForMembersWithMainCharacters({
      groupId: group.id,
      now: new Date("2026-06-05T12:05:00+09:00"),
    });

    const syncedCharacters = await listCharactersForMember(syncedMember.id);
    const manualOnlyCharacters = await listCharactersForMember(manualOnlyMember.id);

    expect(result).toMatchObject({
      failedCount: 0,
      syncedCount: 1,
    });
    expect(syncedCharacters.map((character) => character.name)).toEqual([
      "본캐",
      "부캐",
    ]);
    expect(syncedCharacters[0]).toMatchObject({
      className: "바드",
      itemLevel: 1773.33,
      lastSyncedAt: new Date("2026-06-05T12:05:00+09:00"),
    });
    expect(manualOnlyCharacters).toHaveLength(1);
    expect(manualOnlyCharacters[0].name).toBe("수동캐릭터");
  });

  it("skips main characters that were refreshed within the last five minutes", async () => {
    const group = await createGroup({ name: "Fresh Sync Group" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "최근갱신",
    });
    await createCharacter({
      memberId: member.id,
      name: "본캐",
      className: "바드",
      itemLevel: 1773.33,
      preferredRole: "SUPPORT",
      notes: "",
      serverName: "루페온",
      isMain: true,
      lastSyncedAt: new Date("2026-06-05T12:03:00+09:00"),
    });

    const result = await syncLostArkCharactersForMembersWithMainCharacters({
      groupId: group.id,
      now: new Date("2026-06-05T12:05:00+09:00"),
    });

    expect(result).toMatchObject({
      failedCount: 0,
      syncedCount: 0,
    });
  });

  it("stores auto-sync failure state and clears it after a later success", async () => {
    const group = await createGroup({ name: "Auto Sync Failure State" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "동기화실패",
    });
    await createCharacter({
      memberId: member.id,
      name: "본캐",
      className: "바드",
      itemLevel: 1700,
      preferredRole: "SUPPORT",
      notes: "",
      serverName: "루페온",
      isMain: true,
      lastSyncedAt: new Date("2026-06-05T11:55:00+09:00"),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    );

    const failedAt = new Date("2026-06-05T12:05:00+09:00");
    const failure = await syncLostArkCharactersForMembersWithMainCharacters({
      groupId: group.id,
      now: failedAt,
    });
    const failedMember = await db.member.findUnique({
      where: { id: member.id },
      select: {
        characterSyncFailedAt: true,
        characterSyncFailureReason: true,
      },
    });

    expect(failure).toMatchObject({ failedCount: 1, syncedCount: 0 });
    expect(failedMember?.characterSyncFailedAt).toEqual(failedAt);
    expect(failedMember?.characterSyncFailureReason).toContain("OpenAPI");

    mockLostArkFetch();
    await syncLostArkCharactersForMembersWithMainCharacters({
      groupId: group.id,
      now: new Date("2026-06-05T12:10:00+09:00"),
    });
    const recoveredMember = await db.member.findUnique({
      where: { id: member.id },
      select: {
        characterSyncFailedAt: true,
        characterSyncFailureReason: true,
      },
    });

    expect(recoveredMember).toMatchObject({
      characterSyncFailedAt: null,
      characterSyncFailureReason: null,
    });
  });
});
