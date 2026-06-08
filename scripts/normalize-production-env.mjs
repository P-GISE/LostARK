import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CANONICAL_VALUES = {
  APP_BASE_URL: "https://lostark-party.pigs0516.com",
  APP_DOMAIN: "lostark-party.pigs0516.com",
  SESSION_COOKIE_NAME: "lostark_party_member",
  DISCORD_REDIRECT_URI:
    "https://lostark-party.pigs0516.com/api/discord/oauth/callback",
};

function parseArgs(argv) {
  const args = { envFile: ".env", postgresHostBind: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env-file") {
      args.envFile = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--postgres-host-bind") {
      args.postgresHostBind = argv[index + 1] ?? "";
      index += 1;
    }
  }

  return args;
}

function applyValue(lines, key, value) {
  const prefix = `${key}=`;
  const existingIndex = lines.findIndex((line) => line.startsWith(prefix));

  if (existingIndex === -1) {
    lines.push(`${key}=${value}`);
    return;
  }

  lines[existingIndex] = `${key}=${value}`;
}

export function normalizeProductionEnv(envFile, options) {
  const postgresHostBind = options?.postgresHostBind;
  if (!postgresHostBind) {
    throw new Error("postgresHostBind is required.");
  }

  const content = readFileSync(envFile, "utf8");
  const lines = content.split(/\r?\n/).filter((line, index, allLines) => {
    return line.length > 0 || index < allLines.length - 1;
  });

  applyValue(lines, "POSTGRES_HOST_BIND", postgresHostBind);
  for (const [key, value] of Object.entries(CANONICAL_VALUES)) {
    applyValue(lines, key, value);
  }

  writeFileSync(envFile, `${lines.join("\n")}\n`);
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  normalizeProductionEnv(args.envFile, {
    postgresHostBind: args.postgresHostBind,
  });
  console.log(`Normalized production env: ${args.envFile}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
