import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHARACTER_SYNC_INTERVAL_MS,
  processCharacterSyncJobsOnce,
} from "@/worker/character-sync-worker";

const mocks = vi.hoisted(() => ({
  syncLostArkCharactersForMembersWithMainCharacters: vi.fn(),
}));

vi.mock("@/server/character-sync", () => ({
  syncLostArkCharactersForMembersWithMainCharacters:
    mocks.syncLostArkCharactersForMembersWithMainCharacters,
}));

describe("character sync worker", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs automatic character sync every five minutes", async () => {
    vi.stubEnv("CHARACTER_SYNC_GROUP_ID", "group-1");
    mocks.syncLostArkCharactersForMembersWithMainCharacters.mockResolvedValue({
      failedCount: 0,
      failures: [],
      syncedCount: 1,
    });

    await expect(processCharacterSyncJobsOnce()).resolves.toEqual({
      failedCount: 0,
      failures: [],
      syncedCount: 1,
    });
    expect(CHARACTER_SYNC_INTERVAL_MS).toBe(5 * 60 * 1000);
    expect(
      mocks.syncLostArkCharactersForMembersWithMainCharacters,
    ).toHaveBeenCalledWith({ groupId: "group-1" });
  });
});
