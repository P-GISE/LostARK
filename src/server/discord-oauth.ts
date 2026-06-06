import { signSessionValue, verifySessionValue } from "@/server/auth-context";

const DISCORD_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type DiscordOAuthStatePayload = {
  expiresAt: number;
  memberId: string;
};

function encodeDiscordOAuthState(payload: DiscordOAuthStatePayload) {
  return signSessionValue(JSON.stringify(payload));
}

export function parseDiscordOAuthState(state: string, now = new Date()) {
  const verified = verifySessionValue(state);
  if (!verified) {
    return null;
  }

  try {
    const payload = JSON.parse(verified) as Partial<DiscordOAuthStatePayload>;
    if (
      typeof payload.memberId !== "string" ||
      !payload.memberId.trim() ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < now.getTime()
    ) {
      return null;
    }
    return { memberId: payload.memberId };
  } catch {
    return null;
  }
}

export function getDiscordAuthorizeUrl(memberId: string, now = new Date()) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state: encodeDiscordOAuthState({
      expiresAt: now.getTime() + DISCORD_OAUTH_STATE_TTL_MS,
      memberId,
    }),
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCodeForUserId(code: string) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Discord OAuth is not configured.");
  }

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Discord token exchange failed.");
  }

  const tokenJson = (await tokenResponse.json()) as { access_token: string };
  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error("Discord user lookup failed.");
  }

  const userJson = (await userResponse.json()) as { id: string };
  return userJson.id;
}
