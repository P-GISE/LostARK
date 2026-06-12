# VPS Deployment

This app should run on an Ubuntu VPS so it stays online when the local PC is off.
The default deployment path is Docker Compose plus Tailscale Serve.

## Server Requirements

- Ubuntu 22.04 or 24.04 VPS
- 1 vCPU and 2 GB RAM minimum
- SSH access with a sudo user
- Tailscale account access
- Discord OAuth redirect set to:
  `https://lostark-party.pigs0516.com/api/discord/oauth/callback`

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

Use Tailscale for SSH, deployment, and private database access. The production
public app settings should stay on `https://lostark-party.pigs0516.com`; do not
set `APP_BASE_URL`, `APP_DOMAIN`, or `DISCORD_REDIRECT_URI` to the tailnet host
unless the deployment is intentionally private-only.

## Environment

On the VPS, create `.env` from `.env.vps.example`:

```bash
cp .env.vps.example .env
```

Set these values before deploying:

- `POSTGRES_PASSWORD`: random long database password
- `DATABASE_URL`: use the same password in the URL
- `APP_BASE_URL`: `https://lostark-party.pigs0516.com`
- `APP_DOMAIN`: `lostark-party.pigs0516.com`
- `DISCORD_REDIRECT_URI`: `https://lostark-party.pigs0516.com/api/discord/oauth/callback`
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
curl -I https://lostark-party.pigs0516.com/
docker compose -f docker-compose.vps.yml ps
tailscale serve status
```

## GitHub Auto Deploy

GitHub does not run this Node server directly. GitHub Actions can run tests and
then SSH into the VPS to deploy the newest `main` branch.

Set these repository secrets in GitHub:

- `TS_AUTHKEY`: reusable Tailscale auth key with access to the tailnet
- `VPS_HOST`: VPS Tailscale IP address or MagicDNS name
- `VPS_USER`: Tailscale SSH user, for example `ubuntu`
- `VPS_APP_DIR`: repository path on the VPS, for example `/opt/lostark-party`

After that, every push to `main` runs:

```bash
npm test
npm run lint
npm run build
tailscale ssh "$VPS_USER@$VPS_HOST"
```

To deploy the AWS backup host through the same workflow, set these additional
repository secrets:

- `AWS_HOST`: AWS EC2 Tailscale IP address or MagicDNS name
- `AWS_USER`: AWS EC2 Tailscale SSH user, for example `ubuntu`
- `AWS_APP_DIR`: repository path on the AWS EC2 host, for example `/opt/lostark-party`

When all AWS secrets are present, every push to `main` deploys the same Docker
Compose app image to AWS after the test job. If an AWS secret is missing, push
deployments keep the VPS deployment active and skip AWS with a warning. Manual
workflow runs can choose `target=aws` or `target=all`; missing AWS secrets fail
manual AWS deployments instead of silently skipping them.

The AWS deployment uses the same repository reset, production env normalization,
and `scripts/vps-deploy.sh` path as the VPS. After the app is updated, it
restarts `cloudflared` so the AWS tunnel serves `https://aws.pigs0516.com/`.

## Public Domain Option

The default VPS compose file does not expose ports 80/443 to the public
internet. If a real public domain is connected to the VPS, run Caddy explicitly:

```bash
docker compose -f docker-compose.vps.yml --profile public up -d caddy
```

The production config checker expects the public `lostark-party.pigs0516.com`
values. Keep a tailnet-only URL only for an intentionally private deployment.
