import { NextResponse } from "next/server";
import { getShareBaseUrl } from "@/lib/app-url";
import { requireCurrentMember } from "@/server/auth-context";
import { exchangeDiscordCodeForUserId } from "@/server/discord-oauth";
import { parseDiscordOAuthState } from "@/server/discord-oauth";
import { connectDiscordMember } from "@/server/members";

function buildNotificationsRedirect(request: Request, status: string) {
  const baseUrl = getShareBaseUrl({
    allowedRequestHosts: [process.env.APP_DOMAIN, process.env.APP_BASE_URL],
    configuredBaseUrl: process.env.APP_BASE_URL,
    requestHost:
      request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    requestProto: request.headers.get("x-forwarded-proto"),
  });

  return new URL(`/notifications?discord=${status}`, baseUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(buildNotificationsRedirect(request, "missing"));
  }

  try {
    const currentMember = await requireCurrentMember();
    const oauthState = parseDiscordOAuthState(state);
    if (!oauthState || oauthState.memberId !== currentMember.id) {
      throw new Error("디스코드 OAuth state 검증에 실패했습니다");
    }

    const discordUserId = await exchangeDiscordCodeForUserId(code);
    await connectDiscordMember({ memberId: currentMember.id, discordUserId });
    return NextResponse.redirect(
      buildNotificationsRedirect(request, "connected"),
    );
  } catch {
    return NextResponse.redirect(buildNotificationsRedirect(request, "failed"));
  }
}
