import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import { readJsonObject, stringValue } from "@/server/bot-route-utils";
import { recordRaidSignupDiscordMessage } from "@/server/signups";

type RouteContext = {
  readonly params:
    | Promise<{ readonly signupId: string }>
    | { readonly signupId: string };
};

export async function POST(request: Request, context: RouteContext) {
  const authError = requireBotApiAuth(request);
  if (authError) {
    return authError;
  }

  const { signupId } = await context.params;
  const body = await readJsonObject(request);
  const signup = await recordRaidSignupDiscordMessage({
    discordChannelId: stringValue(body.discordChannelId) || null,
    discordMessageId: stringValue(body.discordMessageId),
    signupId,
  });

  return NextResponse.json({
    discordChannelId: signup.discordChannelId,
    discordMessageId: signup.discordMessageId,
    signupId: signup.id,
  });
}
