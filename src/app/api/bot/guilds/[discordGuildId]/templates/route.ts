import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import { BotGuildMappingError, requireGroupByDiscordGuildId } from "@/server/bot-guilds";
import { botErrorResponse } from "@/server/bot-route-utils";
import { listRaidTemplates } from "@/server/raid-templates";

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

  try {
    const { discordGuildId } = await context.params;
    const group = await requireGroupByDiscordGuildId(discordGuildId);
    const templates = await listRaidTemplates(group.id);

    return NextResponse.json({
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        difficulty: template.difficulty,
        gates: template.gates,
        requiredPlayers: template.requiredPlayers,
        minimumItemLevel: template.minimumItemLevel,
        minimumCombatPower: template.minimumCombatPower,
      })),
    });
  } catch (error) {
    return botErrorResponse(error, error instanceof BotGuildMappingError ? 404 : 400);
  }
}
