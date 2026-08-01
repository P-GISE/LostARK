import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import { findGroupByDiscordGuildId } from "@/server/bot-guilds";
import { getGroupOperationalSettings } from "@/server/group-settings";

type RouteContext = {
  readonly params:
    | Promise<{ readonly discordGuildId: string }>
    | { readonly discordGuildId: string };
};

export async function GET(request: Request, context: RouteContext) {
  const authError = requireBotApiAuth(request);
  if (authError) {
    return authError;
  }

  const { discordGuildId } = await context.params;
  const group = await findGroupByDiscordGuildId(discordGuildId);
  if (!group) {
    return NextResponse.json(
      { error: "연결된 사이트 공대를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const settings = await getGroupOperationalSettings(group.id);

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
    },
    discord: {
      announcementChannelId: settings.discordAnnouncementChannelId,
      guildId: settings.discordGuildId,
      recruitmentChannelId: settings.discordRecruitmentChannelId,
    },
  });
}

