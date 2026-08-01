import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import { BotUserLinkError, requireLinkedDiscordMember } from "@/server/bot-members";
import {
  botErrorResponse,
  botUserLinkResponse,
  readJsonObject,
  stringValue,
} from "@/server/bot-route-utils";
import { db } from "@/server/db";
import { buildDiscordRecruitmentMessage } from "@/server/discord-recruitment";
import { finalizeRaidSignup } from "@/server/signups";

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

  try {
    const { signupId } = await context.params;
    const body = await readJsonObject(request);
    const signup = await db.raidSignup.findUnique({ where: { id: signupId } });
    if (!signup) {
      return NextResponse.json({ error: "모집을 찾을 수 없습니다" }, { status: 404 });
    }
    const member = await requireLinkedDiscordMember({
      discordUserId: stringValue(body.discordUserId),
      groupId: signup.groupId,
    });

    await finalizeRaidSignup({
      actorMemberId: member.id,
      signupId,
    });
    await db.raidSignup.update({
      where: { id: signupId },
      data: { discordClosedAt: new Date() },
    });

    return NextResponse.json({
      message: await buildDiscordRecruitmentMessage(signupId),
    });
  } catch (error) {
    if (error instanceof BotUserLinkError) {
      return botUserLinkResponse(request);
    }
    return botErrorResponse(error);
  }
}
