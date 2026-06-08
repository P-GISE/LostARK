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
