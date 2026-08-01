import { getShareBaseUrl } from "@/lib/app-url";
import { db } from "@/server/db";

export class BotUserLinkError extends Error {
  readonly name = "BotUserLinkError";
}

export function getBotUserLinkUrl(request: Request) {
  const baseUrl = getShareBaseUrl({
    allowedRequestHosts: [process.env.APP_DOMAIN, process.env.APP_BASE_URL],
    configuredBaseUrl: process.env.APP_BASE_URL,
    requestHost: request.headers.get("host"),
    requestProto: request.headers.get("x-forwarded-proto"),
  });

  return `${baseUrl}/notifications`;
}

export async function findLinkedDiscordMember(input: {
  readonly groupId: string;
  readonly discordUserId: string;
}) {
  const discordUserId = input.discordUserId.trim();
  if (!discordUserId) {
    return null;
  }

  return db.member.findFirst({
    include: {
      characters: { orderBy: [{ isMain: "desc" }, { itemLevel: "desc" }] },
    },
    where: {
      discordUserId,
      groupId: input.groupId,
    },
  });
}

export async function requireLinkedDiscordMember(input: {
  readonly groupId: string;
  readonly discordUserId: string;
}) {
  const member = await findLinkedDiscordMember(input);
  if (!member) {
    throw new BotUserLinkError("사이트에 연결된 디스코드 사용자가 아닙니다");
  }

  return member;
}

export function pickBotSignupCharacter(input: {
  readonly characterId?: string;
  readonly member: Awaited<ReturnType<typeof requireLinkedDiscordMember>>;
}) {
  if (input.characterId) {
    return (
      input.member.characters.find(
        (character) => character.id === input.characterId,
      ) ?? null
    );
  }

  return input.member.characters[0] ?? null;
}
