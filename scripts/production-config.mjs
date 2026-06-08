import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PUBLIC_BASE_URL = "https://lostark-party.pigs0516.com";
const PUBLIC_DOMAIN = "lostark-party.pigs0516.com";
const DISCORD_REDIRECT_URI =
  "https://lostark-party.pigs0516.com/api/discord/oauth/callback";

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "APP_BASE_URL",
  "APP_DOMAIN",
  "SESSION_COOKIE_NAME",
  "SESSION_SECRET",
  "ADMIN_EMAILS",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "DISCORD_REDIRECT_URI",
  "LOSTARK_OPEN_API_JWT",
];

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ENABLED_FLAG_VALUES = new Set(["1", "true", "yes", "on"]);

export function parseEnvContent(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function parseArgs(argv) {
  const args = { envFile: ".env", role: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env-file") {
      args.envFile = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--role") {
      args.role = argv[index + 1] ?? "";
      index += 1;
    }
  }

  return args;
}

function readEnvFile(envFile) {
  if (!existsSync(envFile)) {
    return { values: {}, errors: [`Missing environment file: ${envFile}`] };
  }

  return {
    values: parseEnvContent(readFileSync(envFile, "utf8")),
    errors: [],
  };
}

function databaseHost(databaseUrl, errors) {
  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      errors.push("DATABASE_URL must use the postgresql protocol.");
    }
    return url.hostname;
  } catch {
    errors.push("DATABASE_URL must be a valid PostgreSQL connection URL.");
    return "";
  }
}

function enabledFlag(value) {
  return ENABLED_FLAG_VALUES.has((value ?? "").trim().toLowerCase());
}

export function validateProductionEnv(envFile, options) {
  const role = options?.role;
  const errors = [];

  if (!["pc", "server"].includes(role)) {
    errors.push("Role must be either pc or server.");
  }

  const loaded = readEnvFile(envFile);
  errors.push(...loaded.errors);
  const env = loaded.values;

  for (const key of REQUIRED_KEYS) {
    if (!env[key]) {
      errors.push(`${key} is required.`);
    }
  }

  if (env.APP_BASE_URL && env.APP_BASE_URL !== PUBLIC_BASE_URL) {
    errors.push(`APP_BASE_URL must be ${PUBLIC_BASE_URL}.`);
  }

  if (env.APP_DOMAIN && env.APP_DOMAIN !== PUBLIC_DOMAIN) {
    errors.push(`APP_DOMAIN must be ${PUBLIC_DOMAIN}.`);
  }

  if (
    env.DISCORD_REDIRECT_URI &&
    env.DISCORD_REDIRECT_URI !== DISCORD_REDIRECT_URI
  ) {
    errors.push(`DISCORD_REDIRECT_URI must be ${DISCORD_REDIRECT_URI}.`);
  }

  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    errors.push("SESSION_SECRET must be at least 32 characters.");
  }

  if (env.DATABASE_URL) {
    const host = databaseHost(env.DATABASE_URL, errors);
    if (
      role === "pc" &&
      LOCAL_DATABASE_HOSTS.has(host) &&
      !enabledFlag(env.PC_ALLOW_LOCAL_DATABASE)
    ) {
      errors.push(
        "PC production DATABASE_URL must point at the shared server database unless PC_ALLOW_LOCAL_DATABASE=true is set.",
      );
    }
    if (role === "pc" && host === "postgres") {
      errors.push(
        "PC production DATABASE_URL must use the server private network address, not the Docker service name.",
      );
    }
    if (role === "server" && LOCAL_DATABASE_HOSTS.has(host)) {
      errors.push(
        "Server production DATABASE_URL must use the Docker postgres service name or a private database host, not localhost.",
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = validateProductionEnv(args.envFile, { role: args.role });

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Production ${args.role} config OK: ${args.envFile}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
