import { db } from "@/server/db";

export class BotGuildMappingError extends Error {
  readonly name = "BotGuildMappingError";
}

export async function findGroupByDiscordGuildId(discordGuildId: string) {
  const settings = await db.groupSettings.findFirst({
    where: { discordGuildId: discordGuildId.trim() },
    include: { group: true },
  });

  return settings?.group ?? null;
}

export async function requireGroupByDiscordGuildId(discordGuildId: string) {
  const group = await findGroupByDiscordGuildId(discordGuildId);
  if (!group) {
    throw new BotGuildMappingError("연결된 사이트 공대를 찾을 수 없습니다");
  }

  return group;
}

