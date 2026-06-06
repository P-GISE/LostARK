import { syncLostArkCharactersForMembersWithMainCharacters } from "@/server/character-sync";

export const CHARACTER_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function getConfiguredSyncGroupId() {
  return process.env.CHARACTER_SYNC_GROUP_ID?.trim() || undefined;
}

export async function processCharacterSyncJobsOnce() {
  return syncLostArkCharactersForMembersWithMainCharacters({
    groupId: getConfiguredSyncGroupId(),
  });
}

async function main() {
  while (true) {
    const result = await processCharacterSyncJobsOnce();
    if (result.failedCount > 0) {
      console.warn("Lost Ark character sync failures", result.failures);
    }
    await new Promise((resolve) =>
      setTimeout(resolve, CHARACTER_SYNC_INTERVAL_MS),
    );
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
