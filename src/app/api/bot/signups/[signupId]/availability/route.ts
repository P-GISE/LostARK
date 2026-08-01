import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import { BotUserLinkError, requireLinkedDiscordMember } from "@/server/bot-members";
import {
  botErrorResponse,
  botUserLinkResponse,
  numberValue,
  readJsonObject,
  stringValue,
} from "@/server/bot-route-utils";
import { db } from "@/server/db";
import { buildDiscordRecruitmentMessage } from "@/server/discord-recruitment";
import { setAvailabilitySlot } from "@/server/availability";

type RouteContext = {
  readonly params:
    | Promise<{ readonly signupId: string }>
    | { readonly signupId: string };
};

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

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
    const dayIndex = numberValue(body.dayIndex, 0);
    const startHour = numberValue(body.startHour, 20);
    const endHour = numberValue(body.endHour, 23);
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
      return NextResponse.json(
        { error: "선택한 요일이 올바르지 않습니다" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || endHour <= startHour) {
      return NextResponse.json(
        { error: "가능 시간 범위가 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const date = addDays(signup.weekStartDate, dayIndex);
    for (let hour = startHour; hour < endHour; hour += 1) {
      await setAvailabilitySlot({
        date,
        hour,
        memberId: member.id,
        status: "AVAILABLE",
      });
    }

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
