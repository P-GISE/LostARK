const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

function getDiscordBotToken() {
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error("디스코드 봇 토큰 설정이 필요합니다");
  }
  return token;
}

async function readDiscordJson<T>(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message ? `: ${body.message}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`${fallbackMessage}${detail}`);
  }

  return (await response.json()) as T;
}

export async function sendDiscordDm(discordUserId: string, message: string) {
  const token = getDiscordBotToken();
  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  const channel = await readDiscordJson<{ id: string }>(
    await fetch(`${DISCORD_API_BASE_URL}/users/@me/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({ recipient_id: discordUserId }),
    }),
    "디스코드 DM 채널 생성에 실패했습니다",
  );

  await readDiscordJson(
    await fetch(`${DISCORD_API_BASE_URL}/channels/${channel.id}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: message }),
    }),
    "디스코드 DM 발송에 실패했습니다",
  );
}
