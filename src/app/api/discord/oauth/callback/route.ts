import { NextResponse } from "next/server";
import { exchangeDiscordCodeForUserId } from "@/server/discord-oauth";
import { connectDiscordMember } from "@/server/members";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const memberId = url.searchParams.get("state");

  if (!code || !memberId) {
    return NextResponse.redirect(new URL("/notifications?discord=missing", url));
  }

  try {
    const discordUserId = await exchangeDiscordCodeForUserId(code);
    await connectDiscordMember({ memberId, discordUserId });
    return NextResponse.redirect(
      new URL("/notifications?discord=connected", url),
    );
  } catch {
    return NextResponse.redirect(new URL("/notifications?discord=failed", url));
  }
}
