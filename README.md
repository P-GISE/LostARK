# Lost Ark Party Planner

Open-source Lost Ark raid and party scheduling app built with Next.js,
Prisma, PostgreSQL, Discord OAuth/DM notifications, and Lost Ark Open API
character sync.

This project is maintained as a practical tool for raid leaders and static
groups that need to coordinate schedules, member availability, party slots,
character information, and reminders without relying on scattered chats or
manual spreadsheets.

Production URL:

```text
https://lostark-party.pigs0516.com
```

## Features

- Group invite and member management
- Schedule, calendar, and template views
- Main-character import from Lost Ark Open API
- Same-server roster sync with item level and combat power
- Future-only availability and schedule creation safeguards
- Raid-template guide notes for cards, battle items, and leader skills
- Compact schedule detail and slot assignment workflows
- Admin tools for user cleanup and group maintenance
- Discord OAuth connection for each member
- Discord DM notifications for schedule creation and reminders
- Notification worker and automatic character-sync worker
- PC-primary, AWS-backup failover through Cloudflare Tunnel and AWS Lambda

## Why This Project Exists

Lost Ark raid groups often coordinate across several tools at once: chat
messages for schedules, screenshots or spreadsheets for slots, manual character
checks, and separate reminders. That workflow becomes error-prone as soon as
members change availability or the raid leader needs to confirm attendance.

Lost Ark Party Planner focuses on the operational side of group play:

- create schedules from reusable raid templates
- prevent accidental creation of past availability or schedules
- track each member's attendance response and memo
- assign characters to raid slots with a compact review UI
- sync character data from the Lost Ark Open API
- notify connected Discord users when schedules are created or due soon
- keep raid preparation notes attached to the schedule itself

The goal is to provide a maintainable open-source reference for game-community
scheduling, Discord-integrated reminders, and API-backed roster management.

## Maintainer Workflow

The repository is actively maintained with a test-first workflow for behavior
changes. Core server flows, page rendering, and UI components are covered with
Vitest and Testing Library. Before pushing code changes, the expected
verification path is:

```powershell
npm test
npm run lint
npm run build
```

Current maintenance focus:

- safer member and admin deletion behavior
- clearer schedule and availability constraints
- better schedule-detail UX for raid leaders
- richer raid-template notes for preparation, card, and leader-skill guidance
- stable Discord and Lost Ark Open API integrations

## Stack

- Next.js App Router
- React
- Prisma
- PostgreSQL
- Vitest
- Cloudflare Tunnel
- AWS EC2, Lambda, and EventBridge for backup failover

## Local Setup

Install dependencies:

```powershell
npm install
```

Create `.env` from `.env.example` and fill the required values:

```powershell
Copy-Item .env.example .env
```

Start PostgreSQL locally:

```powershell
docker compose up -d postgres
```

Generate Prisma client and run migrations:

```powershell
npm run db:generate
npm run db:migrate
```

Run the app in development:

```powershell
npm run dev
```

## Environment Variables

Required for the core app:

```text
DATABASE_URL
APP_BASE_URL
APP_DOMAIN
SESSION_SECRET
ADMIN_EMAILS
```

Required for Discord OAuth and DM notifications:

```text
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN
DISCORD_REDIRECT_URI
```

Required for Lost Ark character sync:

```text
LOSTARK_OPEN_API_JWT
```

Optional:

```text
DISCORD_GUILD_ID
DISCORD_TOKEN
CHARACTER_SYNC_GROUP_ID
SESSION_COOKIE_NAME
```

Do not commit real `.env` files, API tokens, Cloudflare tokens, AWS keys,
Discord secrets, or Lost Ark API JWTs.

## Discord OAuth

The production Discord redirect URL must be registered in the Discord Developer
Portal:

```text
https://lostark-party.pigs0516.com/api/discord/oauth/callback
```

The root-domain alias is also supported when registered:

```text
https://pigs0516.com/api/discord/oauth/callback
```

If Discord shows an invalid OAuth2 redirect URL error, check that the exact URL
above is present in the application's OAuth2 Redirects list.

## Production On Local PC

Build the app:

```powershell
npm run build
```

Start the production server on port `3001`:

```powershell
$env:PORT = "3001"
.\scripts\start-prod-server.ps1 -Restart
```

Start background workers:

```powershell
.\scripts\start-notification-worker.ps1
.\scripts\start-character-sync-worker.ps1
```

The PC Cloudflare tunnel should route the public hostnames to:

```text
http://127.0.0.1:3001
```

Current public hostnames:

```text
lostark-party.pigs0516.com
pigs0516.com
pc.pigs0516.com
```

## AWS Backup Failover

Failover deployment files are in:

```text
infra/aws-failover/
```

The failover controller checks the PC tunnel, keeps DNS pointed at the PC when
healthy, and starts EC2 plus switches DNS to the AWS tunnel when the PC is down.

Deploy the CloudFormation template in `ap-southeast-2` and pass live IDs/tokens
as parameters. The template intentionally does not contain real Cloudflare
account IDs, tunnel IDs, EC2 instance IDs, or API tokens.

See:

```text
infra/aws-failover/README.md
```

For keeping the PC-primary runtime and server/AWS-backup runtime on one shared
production database, see:

```text
docs/operations/single-production-db-cutover.md
```

For GitHub Actions deployment to the VPS and AWS backup host, see:

```text
docs/vps-deployment.md
```

## Scripts

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run worker:notifications
npm run worker:characters
```

## Verification

Before pushing code changes, run:

```powershell
npm test
npm run lint
npm run build
```

For README-only changes, at minimum check the Git diff and confirm no secrets
are staged.
