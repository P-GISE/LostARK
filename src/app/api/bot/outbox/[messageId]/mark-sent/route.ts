import { NextResponse } from "next/server";
import { requireBotApiAuth } from "@/server/bot-api-auth";
import { markBotOutboxSent } from "@/server/bot-outbox";

type RouteContext = {
  readonly params:
    | Promise<{ readonly messageId: string }>
    | { readonly messageId: string };
};

export async function POST(request: Request, context: RouteContext) {
  const authError = requireBotApiAuth(request);
  if (authError) {
    return authError;
  }

  const { messageId } = await context.params;
  const message = await markBotOutboxSent(messageId);

  return NextResponse.json({ id: message.id, status: message.status });
}

