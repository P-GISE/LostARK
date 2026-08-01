import { NextResponse } from "next/server";

export function requireBotApiAuth(request: Request) {
  const expectedToken = process.env.LOSTARK_BOT_API_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json(
      { error: "봇 API 토큰 설정이 필요합니다" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (authorization !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: "봇 API 인증에 실패했습니다" },
      { status: 401 },
    );
  }

  return null;
}

