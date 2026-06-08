# Single Production Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PC-primary and server/AWS-backup production runtimes use one PostgreSQL source of truth and matching production configuration.

**Architecture:** Keep runtime ports topology-specific: PC runs Next.js on host port `3001`, Docker web runs on service port `3000`. Move consistency enforcement into a production config validator, tracked Cloudflare Tunnel examples, and an operations cutover runbook. The live database stays private-network only and is never exposed to the public internet.

**Tech Stack:** Next.js, Node.js scripts, PowerShell, Bash, Docker Compose, PostgreSQL, Cloudflare Tunnel, Vitest.

---

## File Structure

- Create `scripts/production-config.mjs`: shared production `.env` validator for PC and server roles.
- Modify `package.json`: add explicit config check commands.
- Modify `scripts/start-prod-server.ps1`: fail PC production startup if `.env` points at a local/split database.
- Modify `scripts/vps-deploy.sh`: fail server deployment if production `.env` is not canonical.
- Create `tests/deployment/production-config.test.ts`: behavior tests for the validator.
- Modify `docker-compose.vps.yml`: expose PostgreSQL only through a configurable host bind address with safe localhost default.
- Modify `.env.vps.example`: align server example with the public production domain and private DB bind setting.
- Create `.env.pc-production.example`: document the PC production `.env` shape without real secrets.
- Modify `tests/deployment/vps-config.test.ts`: assert safe PostgreSQL host bind and production domain examples.
- Create `infra/cloudflared/lostark-party-pc.example.yml`: tracked PC tunnel template.
- Create `infra/cloudflared/lostark-party-aws.example.yml`: tracked AWS/server tunnel template.
- Create `tests/deployment/cloudflared-config.test.ts`: assert both tunnel templates serve the required public hostnames.
- Create `docs/operations/single-production-db-cutover.md`: step-by-step live cutover and verification runbook.
- Modify `README.md`: link the production DB cutover runbook.

---

### Task 1: Production Config Validator

**Files:**
- Create: `scripts/production-config.mjs`
- Create: `tests/deployment/production-config.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing validator tests**

Create `tests/deployment/production-config.test.ts` with:

```ts
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const { validateProductionEnv } = await import(
  "../../scripts/production-config.mjs"
);

const shared = {
  APP_BASE_URL: "https://lostark-party.pigs0516.com",
  APP_DOMAIN: "lostark-party.pigs0516.com",
  SESSION_COOKIE_NAME: "lostark_party_member",
  SESSION_SECRET: "12345678901234567890123456789012",
  ADMIN_EMAILS: "admin@example.com",
  DISCORD_CLIENT_ID: "discord-client",
  DISCORD_CLIENT_SECRET: "discord-secret",
  DISCORD_BOT_TOKEN: "discord-bot",
  DISCORD_REDIRECT_URI:
    "https://lostark-party.pigs0516.com/api/discord/oauth/callback",
  LOSTARK_OPEN_API_JWT: "lostark-jwt",
};

function writeEnv(values: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "lostark-production-env-"));
  const file = join(dir, ".env");
  writeFileSync(
    file,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n"),
  );
  return file;
}

describe("production config validator", () => {
  it("accepts PC production config that points at a private server database", () => {
    const envFile = writeEnv({
      ...shared,
      DATABASE_URL:
        "postgresql://lostark:secret@100.64.0.10:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "pc" })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects PC production config that still points at localhost", () => {
    const envFile = writeEnv({
      ...shared,
      DATABASE_URL:
        "postgresql://lostark:secret@127.0.0.1:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "pc" })).toEqual({
      ok: false,
      errors: [
        "PC production DATABASE_URL must point at the shared server database, not localhost.",
      ],
    });
  });

  it("accepts server Docker config that points at the compose postgres service", () => {
    const envFile = writeEnv({
      ...shared,
      DATABASE_URL: "postgresql://lostark:secret@postgres:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "server" })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects production config with non-canonical public URL values", () => {
    const envFile = writeEnv({
      ...shared,
      APP_BASE_URL: "https://lostark-party.tail408126.ts.net",
      APP_DOMAIN: "lostark-party.tail408126.ts.net",
      DISCORD_REDIRECT_URI:
        "https://lostark-party.tail408126.ts.net/api/discord/oauth/callback",
      DATABASE_URL: "postgresql://lostark:secret@postgres:5432/lostark_party",
    });

    expect(validateProductionEnv(envFile, { role: "server" })).toEqual({
      ok: false,
      errors: [
        "APP_BASE_URL must be https://lostark-party.pigs0516.com.",
        "APP_DOMAIN must be lostark-party.pigs0516.com.",
        "DISCORD_REDIRECT_URI must be https://lostark-party.pigs0516.com/api/discord/oauth/callback.",
      ],
    });
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm test -- tests/deployment/production-config.test.ts
```

Expected: FAIL because `scripts/production-config.mjs` does not exist.

- [ ] **Step 3: Implement the validator**

Create `scripts/production-config.mjs` with:

```js
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

  if (env.DISCORD_REDIRECT_URI && env.DISCORD_REDIRECT_URI !== DISCORD_REDIRECT_URI) {
    errors.push(`DISCORD_REDIRECT_URI must be ${DISCORD_REDIRECT_URI}.`);
  }

  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    errors.push("SESSION_SECRET must be at least 32 characters.");
  }

  if (env.DATABASE_URL) {
    const host = databaseHost(env.DATABASE_URL, errors);
    if (role === "pc" && LOCAL_DATABASE_HOSTS.has(host)) {
      errors.push(
        "PC production DATABASE_URL must point at the shared server database, not localhost.",
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
```

- [ ] **Step 4: Add package scripts**

Modify the `scripts` object in `package.json` to include:

```json
"config:check:pc": "node scripts/production-config.mjs --role pc --env-file .env",
"config:check:server": "node scripts/production-config.mjs --role server --env-file .env"
```

Keep the existing scripts unchanged.

- [ ] **Step 5: Verify the validator tests pass**

Run:

```powershell
npm test -- tests/deployment/production-config.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit validator changes**

Run:

```powershell
git add package.json scripts/production-config.mjs tests/deployment/production-config.test.ts
git commit -m "Add production config validator"
```

Expected: commit succeeds.

---

### Task 2: Wire Validator Into PC Startup And Server Deploy

**Files:**
- Modify: `scripts/start-prod-server.ps1`
- Modify: `scripts/vps-deploy.sh`
- Modify: `tests/deployment/vps-scripts.test.ts`
- Create: `tests/deployment/pc-startup-config.test.ts`

- [ ] **Step 1: Write failing script tests**

Create `tests/deployment/pc-startup-config.test.ts` with:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PC production startup config", () => {
  it("checks PC production env before starting Next.js", () => {
    const script = readFileSync("scripts/start-prod-server.ps1", "utf8");

    expect(script).toContain("production-config.mjs");
    expect(script).toContain("--role");
    expect(script).toContain("pc");
    expect(script).toContain("SKIP_PRODUCTION_CONFIG_CHECK");
  });
});
```

Modify `tests/deployment/vps-scripts.test.ts` by adding this test inside the existing `describe` block:

```ts
  it("checks server production env before deploying compose", () => {
    const script = read("scripts/vps-deploy.sh");

    expect(script).toContain("node scripts/production-config.mjs");
    expect(script).toContain("--role server");
    expect(script).toContain("--env-file \"${ENV_FILE}\"");
  });
```

- [ ] **Step 2: Run failing script tests**

Run:

```powershell
npm test -- tests/deployment/pc-startup-config.test.ts tests/deployment/vps-scripts.test.ts
```

Expected: FAIL because startup/deploy scripts do not call the validator.

- [ ] **Step 3: Update PC startup script**

In `scripts/start-prod-server.ps1`, after the `$node` detection block and before the Next CLI check, add:

```powershell
$configCheck = Join-Path $projectRoot "scripts\production-config.mjs"
if (-not $env:SKIP_PRODUCTION_CONFIG_CHECK) {
  & $node $configCheck "--role" "pc" "--env-file" ".env"
  if ($LASTEXITCODE -ne 0) {
    "Production config check failed." |
      Out-File -LiteralPath $errLog -Append -Encoding utf8
    exit $LASTEXITCODE
  }
}
```

- [ ] **Step 4: Update server deploy script**

In `scripts/vps-deploy.sh`, after the `require_env "SESSION_SECRET"` line, add:

```bash
node scripts/production-config.mjs --role server --env-file "${ENV_FILE}"
```

- [ ] **Step 5: Verify script tests pass**

Run:

```powershell
npm test -- tests/deployment/pc-startup-config.test.ts tests/deployment/vps-scripts.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit script integration**

Run:

```powershell
git add scripts/start-prod-server.ps1 scripts/vps-deploy.sh tests/deployment/pc-startup-config.test.ts tests/deployment/vps-scripts.test.ts
git commit -m "Check production config during startup and deploy"
```

Expected: commit succeeds.

---

### Task 3: Align Production Env Examples And Private DB Exposure

**Files:**
- Modify: `docker-compose.vps.yml`
- Modify: `.env.vps.example`
- Create: `.env.pc-production.example`
- Modify: `tests/deployment/vps-config.test.ts`

- [ ] **Step 1: Write failing config tests**

Modify `tests/deployment/vps-config.test.ts`:

Replace the test named `"binds the app to localhost for Tailscale Serve on the VPS host"` with:

```ts
  it("binds the app and database safely on the VPS host", () => {
    const compose = read("docker-compose.vps.yml");

    expect(compose).toContain('"127.0.0.1:3000:3000"');
    expect(compose).toContain(
      '"${POSTGRES_HOST_BIND:-127.0.0.1}:5432:5432"',
    );
  });
```

Add this test inside the existing `describe` block:

```ts
  it("documents canonical production env values for VPS and PC runtimes", () => {
    const vpsEnv = read(".env.vps.example");
    const pcEnv = read(".env.pc-production.example");

    expect(vpsEnv).toContain("APP_BASE_URL=https://lostark-party.pigs0516.com");
    expect(vpsEnv).toContain("APP_DOMAIN=lostark-party.pigs0516.com");
    expect(vpsEnv).toContain(
      "DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback",
    );
    expect(vpsEnv).toContain("POSTGRES_HOST_BIND=127.0.0.1");

    expect(pcEnv).toContain("APP_BASE_URL=https://lostark-party.pigs0516.com");
    expect(pcEnv).toContain("APP_DOMAIN=lostark-party.pigs0516.com");
    expect(pcEnv).toContain(
      "DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback",
    );
    expect(pcEnv).toContain("DATABASE_URL=postgresql://lostark:");
    expect(pcEnv).toContain("@100.64.0.10:5432/lostark_party");
  });
```

- [ ] **Step 2: Run failing config tests**

Run:

```powershell
npm test -- tests/deployment/vps-config.test.ts
```

Expected: FAIL because the DB bind and PC production env example do not exist yet.

- [ ] **Step 3: Update Docker Compose PostgreSQL binding**

In `docker-compose.vps.yml`, add this under the `postgres` service, next to the existing environment block:

```yaml
    ports:
      - "${POSTGRES_HOST_BIND:-127.0.0.1}:5432:5432"
```

Keep the existing `volumes` and `healthcheck` unchanged.

- [ ] **Step 4: Update the VPS env example**

Replace `.env.vps.example` with:

```text
POSTGRES_PASSWORD=
POSTGRES_HOST_BIND=127.0.0.1
DATABASE_URL=postgresql://lostark:${POSTGRES_PASSWORD}@postgres:5432/lostark_party
APP_BASE_URL=https://lostark-party.pigs0516.com
APP_DOMAIN=lostark-party.pigs0516.com
SESSION_COOKIE_NAME=lostark_party_member
SESSION_SECRET=
ADMIN_EMAILS=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_TOKEN=
DISCORD_GUILD_ID=
DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback
LOSTARK_OPEN_API_JWT=
CHARACTER_SYNC_GROUP_ID=
```

- [ ] **Step 5: Add the PC production env example**

Create `.env.pc-production.example` with:

```text
DATABASE_URL=postgresql://lostark:database-password@100.64.0.10:5432/lostark_party
APP_BASE_URL=https://lostark-party.pigs0516.com
APP_DOMAIN=lostark-party.pigs0516.com
SESSION_COOKIE_NAME=lostark_party_member
SESSION_SECRET=
ADMIN_EMAILS=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_TOKEN=
DISCORD_GUILD_ID=
DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback
LOSTARK_OPEN_API_JWT=
CHARACTER_SYNC_GROUP_ID=
```

- [ ] **Step 6: Verify config tests pass**

Run:

```powershell
npm test -- tests/deployment/vps-config.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit env and compose changes**

Run:

```powershell
git add docker-compose.vps.yml .env.vps.example .env.pc-production.example tests/deployment/vps-config.test.ts
git commit -m "Align production env examples for shared database"
```

Expected: commit succeeds.

---

### Task 4: Track Cloudflare Tunnel Templates For Both Routes

**Files:**
- Create: `infra/cloudflared/lostark-party-pc.example.yml`
- Create: `infra/cloudflared/lostark-party-aws.example.yml`
- Create: `tests/deployment/cloudflared-config.test.ts`

- [ ] **Step 1: Write failing tunnel config tests**

Create `tests/deployment/cloudflared-config.test.ts` with:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Cloudflare tunnel config examples", () => {
  it("routes every public hostname to the PC production port", () => {
    const config = read("infra/cloudflared/lostark-party-pc.example.yml");

    expect(config).toContain("hostname: lostark-party.pigs0516.com");
    expect(config).toContain("hostname: pigs0516.com");
    expect(config).toContain("hostname: www.pigs0516.com");
    expect(config).toContain("hostname: pc.pigs0516.com");
    expect(config.match(/service: http:\/\/127\.0\.0\.1:3001/g)).toHaveLength(4);
  });

  it("routes every failover hostname to the server production port", () => {
    const config = read("infra/cloudflared/lostark-party-aws.example.yml");

    expect(config).toContain("hostname: lostark-party.pigs0516.com");
    expect(config).toContain("hostname: pigs0516.com");
    expect(config).toContain("hostname: www.pigs0516.com");
    expect(config).toContain("hostname: aws.pigs0516.com");
    expect(config.match(/service: http:\/\/127\.0\.0\.1:3000/g)).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run failing tunnel tests**

Run:

```powershell
npm test -- tests/deployment/cloudflared-config.test.ts
```

Expected: FAIL because `infra/cloudflared` examples do not exist.

- [ ] **Step 3: Add the PC tunnel template**

Create `infra/cloudflared/lostark-party-pc.example.yml` with:

```yaml
tunnel: pc-tunnel-id
credentials-file: /etc/cloudflared/lostark-party-pc.json
loglevel: info

ingress:
  - hostname: lostark-party.pigs0516.com
    service: http://127.0.0.1:3001
  - hostname: pigs0516.com
    service: http://127.0.0.1:3001
  - hostname: www.pigs0516.com
    service: http://127.0.0.1:3001
  - hostname: pc.pigs0516.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

- [ ] **Step 4: Add the AWS/server tunnel template**

Create `infra/cloudflared/lostark-party-aws.example.yml` with:

```yaml
tunnel: aws-tunnel-id
credentials-file: /etc/cloudflared/lostark-party-aws.json
loglevel: info

ingress:
  - hostname: lostark-party.pigs0516.com
    service: http://127.0.0.1:3000
  - hostname: pigs0516.com
    service: http://127.0.0.1:3000
  - hostname: www.pigs0516.com
    service: http://127.0.0.1:3000
  - hostname: aws.pigs0516.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

- [ ] **Step 5: Verify tunnel tests pass**

Run:

```powershell
npm test -- tests/deployment/cloudflared-config.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit tunnel templates**

Run:

```powershell
git add infra/cloudflared/lostark-party-pc.example.yml infra/cloudflared/lostark-party-aws.example.yml tests/deployment/cloudflared-config.test.ts
git commit -m "Document production tunnel route templates"
```

Expected: commit succeeds.

---

### Task 5: Production Cutover Runbook

**Files:**
- Create: `docs/operations/single-production-db-cutover.md`
- Modify: `README.md`

- [ ] **Step 1: Add the runbook**

Create `docs/operations/single-production-db-cutover.md` with:

```md
# Single Production DB Cutover

This runbook makes the server PostgreSQL database the single production data
source for both the PC-primary app and the server/AWS-backup app.

## Preconditions

- The newest production data source has been identified.
- The server has Tailscale or another private network path from the PC.
- The server PostgreSQL port is not exposed to the public internet.
- The same `SESSION_SECRET` is used by PC and server production runtimes.
- Discord redirect URI is registered as:
  `https://lostark-party.pigs0516.com/api/discord/oauth/callback`.

## 1. Identify The Server Private IP

On the server:

```bash
tailscale ip -4
```

Use the printed private IP as `SERVER_PRIVATE_IP` in the remaining steps.

## 2. Configure Server `.env`

Set these values on the server `.env`:

```text
POSTGRES_HOST_BIND=SERVER_PRIVATE_IP
DATABASE_URL=postgresql://lostark:POSTGRES_PASSWORD_VALUE@postgres:5432/lostark_party
APP_BASE_URL=https://lostark-party.pigs0516.com
APP_DOMAIN=lostark-party.pigs0516.com
DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback
```

Keep all secret values real on the server. Do not commit them.

## 3. Deploy Server Stack

On the server from the repository root:

```bash
bash scripts/vps-deploy.sh
```

Verify:

```bash
docker compose -f docker-compose.vps.yml ps
curl -I http://127.0.0.1:3000/
```

## 4. If PC DB Has The Newest Data

On the PC from the repository root:

```powershell
docker compose exec -T postgres pg_dump -U lostark -d lostark_party > output\pc-production-transfer.sql
```

Copy `output\pc-production-transfer.sql` to the server through SSH or another
private transfer path.

On the server, stop app workers before restore:

```bash
docker compose -f docker-compose.vps.yml stop web worker character-worker
docker compose -f docker-compose.vps.yml exec -T postgres psql -U lostark -d lostark_party < pc-production-transfer.sql
docker compose -f docker-compose.vps.yml up -d web worker character-worker
```

Skip this section if the server DB is already authoritative.

## 5. Configure PC `.env`

Set the PC `.env` database URL to the server private IP:

```text
DATABASE_URL=postgresql://lostark:POSTGRES_PASSWORD_VALUE@SERVER_PRIVATE_IP:5432/lostark_party
APP_BASE_URL=https://lostark-party.pigs0516.com
APP_DOMAIN=lostark-party.pigs0516.com
DISCORD_REDIRECT_URI=https://lostark-party.pigs0516.com/api/discord/oauth/callback
```

Keep `SESSION_SECRET` identical to the server.

## 6. Restart PC App And Tunnel

On the PC:

```powershell
npm run config:check:pc
.\scripts\start-prod-server.ps1 -Restart
```

If the PC Cloudflare Tunnel is not running, restart it with the local production
cloudflared config that routes to `127.0.0.1:3001`.

## 7. Verification

On the PC:

```powershell
curl.exe -I http://127.0.0.1:3001/
curl.exe -I -L https://lostark-party.pigs0516.com/
```

On the server:

```bash
curl -I http://127.0.0.1:3000/
```

From a network outside the server private network, confirm PostgreSQL is not
publicly reachable:

```powershell
Test-NetConnection lostark-party.pigs0516.com -Port 5432
```

Expected: `TcpTestSucceeded : False`.

Finally, create or update one low-risk app record through the active public
route, then verify the same record is visible through the alternate route after
manual or Lambda failover.
```

- [ ] **Step 2: Link the runbook from README**

In `README.md`, add this under the `AWS Backup Failover` section after the link
to `infra/aws-failover/README.md`:

```md
For keeping the PC-primary runtime and server/AWS-backup runtime on one shared
production database, see:

```text
docs/operations/single-production-db-cutover.md
```
```

- [ ] **Step 3: Verify docs are present**

Run:

```powershell
Test-Path docs\operations\single-production-db-cutover.md
Select-String -Path README.md -Pattern "single-production-db-cutover"
```

Expected: first command prints `True`; second command prints the README match.

- [ ] **Step 4: Commit runbook**

Run:

```powershell
git add docs/operations/single-production-db-cutover.md README.md
git commit -m "Add shared production database cutover runbook"
```

Expected: commit succeeds.

---

### Task 6: Full Verification

**Files:**
- No file changes.

- [ ] **Step 1: Run targeted deployment tests**

Run:

```powershell
npm test -- tests/deployment/production-config.test.ts tests/deployment/pc-startup-config.test.ts tests/deployment/vps-config.test.ts tests/deployment/vps-scripts.test.ts tests/deployment/cloudflared-config.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full automated verification suite**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 3: Verify the currently active PC public route still works**

Run:

```powershell
curl.exe -I http://127.0.0.1:3001/
curl.exe -I -L https://lostark-party.pigs0516.com/
```

Expected: both return `HTTP/1.1 200 OK`.

- [ ] **Step 4: Review git status**

Run:

```powershell
git status --short
```

Expected: only unrelated pre-existing files remain modified.

---

## Live Cutover Execution Notes

The repository changes above make the desired production shape enforceable, but
they do not copy secret values or move live data by themselves.

After the plan is implemented and verified, execute the runbook on the actual
server and PC. Stop before the database restore step if the authoritative data
source is unclear. Do not run `pg_restore`, `psql < dump.sql`, or any command
that overwrites server data until the newest live database has been identified.
