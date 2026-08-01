import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";

export async function GET(request: Request) {
  const authError = requireBotApiAuth(request);
  if (authError) {
    return authError;
  }

  return NextResponse.json({ ok: true });
}

