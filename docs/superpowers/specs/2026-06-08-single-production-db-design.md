# Single Production Database Design

## Goal

Make the PC-primary runtime and the server/AWS-backup runtime use the same
production configuration and the same production PostgreSQL data source.

The public app should behave the same whether Cloudflare routes traffic to the
PC tunnel or to the backup server tunnel. Schedule, member, auth, notification,
and character-sync data must not split between two independent databases.

## Current State

The PC runtime starts Next.js directly on Windows:

- Next.js listens on `127.0.0.1:3001`.
- The PC Cloudflare Tunnel routes public hostnames to `127.0.0.1:3001`.
- The PC `.env` currently controls the runtime database and secrets.

The server/AWS runtime uses Docker Compose:

- The `web` container listens on port `3000`.
- PostgreSQL runs as a Docker service with persistent Docker volume storage.
- Workers run as separate Docker services.
- The server `.env` is separate from the PC `.env`.

This means the app code can be synced through Git, but runtime configuration and
database state can diverge.

## Target Architecture

Use one production PostgreSQL database as the source of truth. The backup/server
PostgreSQL instance is the production database owner, and every production app
runtime points at it.

PC runtime:

- App process stays on `127.0.0.1:3001`.
- PC Cloudflare Tunnel keeps routing public hostnames to `127.0.0.1:3001`.
- `DATABASE_URL` points to the production PostgreSQL endpoint over a private
  network path.

Server/AWS runtime:

- Docker `web`, `worker`, and `character-worker` use the same production
  `DATABASE_URL`.
- The local Docker PostgreSQL service remains the production database service
  when the app runs on that server.
- Backup/public tunnel routing must include every public hostname that can be
  served during failover.

## Network And Security

Do not expose PostgreSQL directly to the public internet.

The preferred DB path from the PC to the server database is a private network
address, such as a Tailscale IP or another private tunnel. Firewall rules should
allow PostgreSQL only from trusted private-network peers, not from `0.0.0.0/0`.

Secrets stay out of Git. Example files document required keys, but real values
remain in local `.env` files or deployment secret stores.

## Configuration Rules

These values should match across production runtimes:

- `APP_BASE_URL=https://lostark-party.pigs0516.com`
- `APP_DOMAIN=lostark-party.pigs0516.com`
- `SESSION_COOKIE_NAME`
- `SESSION_SECRET`
- `ADMIN_EMAILS`
- Discord OAuth and bot credentials
- Lost Ark Open API credentials
- `CHARACTER_SYNC_GROUP_ID`, if used

These values may differ only when required by runtime topology:

- `DATABASE_URL`, if the hostname differs but points to the same PostgreSQL
  instance
- process ports: PC uses host port `3001`; Docker web uses service port `3000`
- tunnel IDs and credential file paths

## Data Migration

Before switching PC production traffic to the shared database, decide which
database has the live data to keep.

If the PC database currently has the newest live data, export it with `pg_dump`
and restore it into the server PostgreSQL database during a maintenance window.
After that migration, the PC runtime must stop using the old local database for
production.

If the server database is already authoritative, no import is needed. The PC
runtime can switch its `DATABASE_URL` directly to the server database.

## Failover Requirements

The failover path must route the same public app hostnames as the PC path:

- `lostark-party.pigs0516.com`
- `pigs0516.com`
- `www.pigs0516.com`, if used
- any explicit health hostname used by the failover controller

The failover controller should switch public DNS to the backup tunnel only after
the backup app and shared database are reachable.

## Verification

Verification must prove both runtimes see the same database:

1. Create or update a low-risk record through the PC-routed app.
2. Read the same record through the server/AWS-routed app.
3. Create or update a low-risk record through the server/AWS-routed app.
4. Read the same record through the PC-routed app.
5. Confirm `https://lostark-party.pigs0516.com/` returns `200 OK` on the active
   route.
6. Confirm PostgreSQL is not reachable from the public internet.
7. Confirm workers run against the same database and do not duplicate reminder
   sends unexpectedly.

## Non-Goals

- Do not commit real `.env` secrets.
- Do not introduce multi-primary database replication.
- Do not keep two production databases active with manual reconciliation.
- Do not expose PostgreSQL publicly as a shortcut.
