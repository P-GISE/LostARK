import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
function parseEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readLocalEnvValue(name: string) {
  if (process.env.VITEST) {
    return null;
  }

  const envPaths = new Set<string>();
  envPaths.add(join(process.cwd(), ".env"));

  let currentDir = __dirname;
  for (let depth = 0; depth < 8; depth += 1) {
    envPaths.add(join(currentDir, ".env"));
    const parent = dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  try {
    const prefix = `${name}=`;
    for (const envPath of envPaths) {
      if (!existsSync(envPath)) {
        continue;
      }
      const contents = readFileSync(envPath, "utf8");
      const line = contents
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(prefix));

      if (line) {
        return parseEnvValue(line.slice(prefix.length));
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getConfiguredSessionSecret() {
  const sessionSecret =
    process.env.SESSION_SECRET?.trim() ?? readLocalEnvValue("SESSION_SECRET");
  if (sessionSecret) {
    return sessionSecret;
  }

  return null;
}

function getRequiredSessionSecret() {
  const secret = getConfiguredSessionSecret();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required.");
  }
  return "lostark-party-planner-dev-session-secret";
}

function getOptionalSessionSecret() {
  const secret = getConfiguredSessionSecret();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return "lostark-party-planner-dev-session-secret";
}

function sessionSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signOAuthValue(
  value: string,
  secret = getRequiredSessionSecret(),
) {
  const payload = Buffer.from(value, "utf8").toString("base64url");
  return `${payload}.${sessionSignature(payload, secret)}`;
}

export function verifyOAuthValue(value: string, secret?: string | null) {
  const sessionSecret =
    secret === undefined ? getOptionalSessionSecret() : secret;
  if (!sessionSecret) {
    return null;
  }

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  const expected = sessionSignature(payload, sessionSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return decoded.trim() ? decoded : null;
  } catch {
    return null;
  }
}

