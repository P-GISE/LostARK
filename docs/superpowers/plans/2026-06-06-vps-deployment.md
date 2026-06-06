# VPS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Lost Ark party planner from a local PC-hosted server to an Ubuntu VPS so the site stays online when the PC is off.

**Architecture:** Run the Next.js app, notification worker, character worker, and Postgres through Docker Compose on the VPS. Bind the web container to `127.0.0.1:3000` on the host and publish that port through Tailscale Serve; keep public Caddy exposure behind an explicit compose profile.

**Tech Stack:** Next.js, Prisma, PostgreSQL 17, Docker Compose, Tailscale Serve, optional Caddy.

---

### Task 1: Harden VPS Compose Configuration

**Files:**
- Create: `.dockerignore`
- Modify: `docker-compose.vps.yml`
- Modify: `.env.vps.example`
- Test: `tests/deployment/vps-config.test.ts`

- [x] **Step 1: Write the failing deployment config test**

```ts
expect(read(".dockerignore")).toContain(".env");
expect(read("docker-compose.vps.yml")).toContain('"127.0.0.1:3000:3000"');
expect(read("docker-compose.vps.yml")).toContain(
  "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}",
);
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests\\deployment\\vps-config.test.ts --reporter verbose`

Expected: FAIL because `.dockerignore` is missing and compose uses the old static database password.

- [x] **Step 3: Add the minimal config changes**

Add `.dockerignore`, require `POSTGRES_PASSWORD`, bind web to localhost, add Postgres healthcheck, and move Caddy into the `public` profile.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests\\deployment\\vps-config.test.ts --reporter verbose`

Expected: PASS.

### Task 2: Add VPS Helper Scripts

**Files:**
- Create: `scripts/vps-bootstrap.sh`
- Create: `scripts/vps-deploy.sh`
- Create: `scripts/vps-tailscale-serve.sh`
- Test: `tests/deployment/vps-scripts.test.ts`

- [x] **Step 1: Write the failing script presence test**

```ts
expect(read("scripts/vps-bootstrap.sh")).toContain("docker-ce");
expect(read("scripts/vps-deploy.sh")).toContain("SESSION_SECRET");
expect(read("scripts/vps-tailscale-serve.sh")).toContain("tailscale serve --bg 3000");
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests\\deployment\\vps-scripts.test.ts --reporter verbose`

Expected: FAIL because the scripts do not exist.

- [x] **Step 3: Add the helper scripts**

Create scripts for Ubuntu bootstrap, compose deployment, and Tailscale Serve publication.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests\\deployment\\vps-scripts.test.ts --reporter verbose`

Expected: PASS.

### Task 3: Deploy To VPS

**Files:**
- Use: `docs/vps-deployment.md`
- Use: `scripts/vps-bootstrap.sh`
- Use: `scripts/vps-deploy.sh`
- Use: `scripts/vps-tailscale-serve.sh`

- [ ] **Step 1: Get VPS SSH details**

Required values:

```text
VPS SSH host or IP
SSH user
SSH key or password access
Tailscale auth key, or permission to log in manually on the VPS
```

- [ ] **Step 2: Bootstrap the VPS**

Run on the VPS:

```bash
bash scripts/vps-bootstrap.sh
```

- [ ] **Step 3: Configure `.env`**

Run on the VPS:

```bash
cp .env.vps.example .env
```

Set strong real values for `POSTGRES_PASSWORD`, `DATABASE_URL`, `SESSION_SECRET`, Discord secrets, and API keys.

- [ ] **Step 4: Deploy and expose through Tailscale**

Run on the VPS:

```bash
bash scripts/vps-deploy.sh
bash scripts/vps-tailscale-serve.sh
```

- [ ] **Step 5: Verify from outside the VPS**

Run:

```bash
curl -I https://lostark-party.tail408126.ts.net/
```

Expected: HTTP 200 or an intentional redirect to the app login flow.
