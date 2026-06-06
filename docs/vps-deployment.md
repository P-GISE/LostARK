# VPS Deployment

This app should run on an Ubuntu VPS so it stays online when the local PC is off.
The default deployment path is Docker Compose plus Tailscale Serve.

## Server Requirements

- Ubuntu 22.04 or 24.04 VPS
- 1 vCPU and 2 GB RAM minimum
- SSH access with a sudo user
- Tailscale account access
- Discord OAuth redirect set to:
  `https://lostark-party.tail408126.ts.net/api/discord/oauth/callback`

## First Server Setup

On the VPS:

```bash
bash scripts/vps-bootstrap.sh
```

If you have a reusable Tailscale auth key:

```bash
TAILSCALE_AUTHKEY=tskey-auth-... bash scripts/vps-bootstrap.sh
```

Without an auth key, the script prints the manual command:

```bash
sudo tailscale up --ssh --hostname "lostark-party"
```

To keep the existing URL `https://lostark-party.tail408126.ts.net`, the VPS
must own the Tailscale hostname `lostark-party`. Rename or remove the old local
PC node from Tailscale if the name is already taken.

## Environment

On the VPS, create `.env` from `.env.vps.example`:

```bash
cp .env.vps.example .env
```

Set these values before deploying:

- `POSTGRES_PASSWORD`: random long database password
- `DATABASE_URL`: use the same password in the URL
- `APP_BASE_URL`: `https://lostark-party.tail408126.ts.net`
- `APP_DOMAIN`: `lostark-party.tail408126.ts.net`
- `SESSION_SECRET`: random long session signing secret
- `ADMIN_EMAILS`: admin login email list
- Discord and Lost Ark API secrets as needed

## Deploy

On the VPS from the repository root:

```bash
bash scripts/vps-deploy.sh
```

This builds the Docker image, runs database migrations, starts the web app,
and starts the notification and character workers.

Expose it on the tailnet:

```bash
bash scripts/vps-tailscale-serve.sh
```

Verify:

```bash
curl -I http://127.0.0.1:3000/
curl -I https://lostark-party.tail408126.ts.net/
docker compose -f docker-compose.vps.yml ps
tailscale serve status
```

## GitHub Auto Deploy

GitHub does not run this Node server directly. GitHub Actions can run tests and
then SSH into the VPS to deploy the newest `main` branch.

Set these repository secrets in GitHub:

- `VPS_HOST`: VPS IP address or DNS name
- `VPS_USER`: SSH user, for example `ubuntu`
- `VPS_SSH_KEY`: private SSH key that can access the VPS
- `VPS_SSH_PORT`: optional SSH port, usually `22`
- `VPS_APP_DIR`: repository path on the VPS, for example `/opt/lostark-party`

After that, every push to `main` runs:

```bash
npm test
npm run lint
npm run build
bash scripts/vps-deploy.sh
bash scripts/vps-tailscale-serve.sh
```

## Public Domain Option

The default VPS compose file does not expose ports 80/443 to the public
internet. If a real public domain is connected to the VPS, run Caddy explicitly:

```bash
docker compose -f docker-compose.vps.yml --profile public up -d caddy
```

Keep using the default Tailscale path if the site should stay tailnet-only.
