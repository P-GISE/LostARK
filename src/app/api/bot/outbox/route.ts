import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import {
  listPendingBotOutboxMessages,
  serializeBotOutboxMessage,
} from "@/server/bot-outbox";

export async function GET(request: Request) {
  const authError = requireBotApiAuth(request);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const messages = await listPendingBotOutboxMessages(limit);

  return NextResponse.json({
    messages: messages.map(serializeBotOutboxMessage),
  });
}

