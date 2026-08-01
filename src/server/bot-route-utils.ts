import { NextResponse } from "next/server";
import { getBotUserLinkUrl } from "@/server/bot-members";

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => ({}));
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }

  return body as Record<string, unknown>;
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function numberValue(value: unknown, fallback: number) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return fallback;
}

export function botUserLinkResponse(request: Request) {
  return NextResponse.json(
    {
      error: "사이트에서 디스코드 계정을 먼저 연결해야 합니다",
      linkUrl: getBotUserLinkUrl(request),
    },
    { status: 403 },
  );
}

export function botErrorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "요청 처리에 실패했습니다";
  return NextResponse.json({ error: message }, { status });
}
