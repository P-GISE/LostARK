import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import { BotUserLinkError, requireLinkedDiscordMember } from "@/server/bot-members";
import { BotGuildMappingError, requireGroupByDiscordGuildId } from "@/server/bot-guilds";
import {
  botErrorResponse,
  botUserLinkResponse,
  numberValue,
  readJsonObject,
  stringValue,
} from "@/server/bot-route-utils";
import { buildDiscordRecruitmentMessage } from "@/server/discord-recruitment";
import { getGroupOperationalSettings } from "@/server/group-settings";
import { createRaidSignup } from "@/server/signups";

type RouteContext = {
  readonly params:
    | Promise<{ readonly discordGuildId: string }>
    | { readonly discordGuildId: string };
};

export async function POST(request: Request, context: RouteContext) {
  const authError = requireBotApiAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const { discordGuildId } = await context.params;
    const body = await readJsonObject(request);
    const group = await requireGroupByDiscordGuildId(discordGuildId);
    const settings = await getGroupOperationalSettings(group.id);
    const actor = await requireLinkedDiscordMember({
      discordUserId: stringValue(body.discordUserId),
      groupId: group.id,
    });
    const signup = await createRaidSignup({
      actorMemberId: actor.id,
      discordChannelId:
        stringValue(body.discordChannelId) ||
        settings.discordRecruitmentChannelId ||
        null,
      discordGuildId,
      maxParties: numberValue(body.maxParties, 1),
      partySize: numberValue(body.partySize, 1),
      templateId: stringValue(body.templateId),
      title: stringValue(body.title),
      weekStartDate: stringValue(body.weekStartDate),
    });
    const message = await buildDiscordRecruitmentMessage(signup.id);

    return NextResponse.json({ message, signupId: signup.id });
  } catch (error) {
    if (error instanceof BotUserLinkError) {
      return botUserLinkResponse(request);
    }
    return botErrorResponse(error, error instanceof BotGuildMappingError ? 404 : 400);
  }
}
