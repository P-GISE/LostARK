# Cloudflare PC AWS Failover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the Lost Ark party planner from the local Windows PC when it is online, and start the AWS EC2 backup only when the PC-hosted site is unavailable.

**Architecture:** Use Cloudflare Tunnel for public ingress on `pigs0516.com`. The low-cost target architecture uses separate PC and AWS tunnel connectors plus a scheduled AWS Lambda failover controller that checks PC health, switches Cloudflare DNS to the healthy tunnel, and starts or stops the EC2 instance.

**Tech Stack:** Cloudflare DNS and Tunnel, Windows PowerShell scheduled tasks, Next.js production server, PostgreSQL, AWS EC2, AWS Lambda, Amazon EventBridge Scheduler.

---

### Task 1: Establish Cloudflare Access For Automation

**Files:**
- Use: `D:\tmp\cloudflared.exe`
- Use: Cloudflare dashboard for `pigs0516.com`

- [ ] **Step 1: Create a scoped Cloudflare API token**

In Cloudflare dashboard, create an API token with these permissions:

```text
Zone / Zone / Read
Zone / DNS / Edit
Account / Cloudflare Tunnel / Edit
```

Limit the zone scope to:

```text
pigs0516.com
```

- [ ] **Step 2: Verify the token can access the zone**

Run locally after setting the token in the current PowerShell process:

```powershell
curl.exe -s -H "Authorization: Bearer $env:CLOUDFLARE_API_TOKEN" `
  -H "Content-Type: application/json" `
  "https://api.cloudflare.com/client/v4/zones?name=pigs0516.com"
```

Expected: JSON with `"success":true` and one zone result.

### Task 2: Configure PC Tunnel

**Files:**
- Create: `C:\Cloudflared\pc-config.yml`
- Use: `D:\tmp\cloudflared.exe`

- [ ] **Step 1: Create the PC tunnel**

Create a locally managed Cloudflare Tunnel named:

```text
lostark-party-pc
```

The PC tunnel ingress must route:

```yaml
ingress:
  - hostname: pigs0516.com
    service: http://127.0.0.1:3001
  - hostname: www.pigs0516.com
    service: http://127.0.0.1:3001
  - hostname: pc.pigs0516.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

- [ ] **Step 2: Create fixed PC DNS route**

Create or update:

```text
pc.pigs0516.com CNAME <pc-tunnel-uuid>.cfargotunnel.com
```

- [ ] **Step 3: Create active production DNS route**

Initially point the public app hostnames at the PC tunnel:

```text
pigs0516.com     CNAME <pc-tunnel-uuid>.cfargotunnel.com
www.pigs0516.com CNAME <pc-tunnel-uuid>.cfargotunnel.com
```

- [ ] **Step 4: Run and verify PC tunnel**

Run:

```powershell
D:\tmp\cloudflared.exe --config C:\Cloudflared\pc-config.yml tunnel run lostark-party-pc
```

Verify:

```powershell
curl.exe -I https://pc.pigs0516.com/
curl.exe -I https://pigs0516.com/
```

Expected: `HTTP/1.1 200 OK` or `HTTP/2 200`.

### Task 3: Configure PC App Startup

**Files:**
- Modify: `.env`
- Use: `scripts/register-startup-task.ps1`
- Use: `scripts/start-prod-server.ps1`
- Use: `scripts/start-notification-worker.ps1`
- Use: `scripts/start-character-sync-worker.ps1`

- [ ] **Step 1: Update local public URL values**

Set:

```text
APP_BASE_URL=https://pigs0516.com
APP_DOMAIN=pigs0516.com
DISCORD_REDIRECT_URI=https://pigs0516.com/api/discord/oauth/callback
```

- [ ] **Step 2: Rebuild and start local production server**

Run:

```powershell
npm run build
$env:PORT = "3001"
.\scripts\start-prod-server.ps1 -Restart
```

Expected: local Next.js server listens on port `3001`.

- [ ] **Step 3: Register Windows startup task**

Run as administrator:

```powershell
.\scripts\register-startup-task.ps1 -Port 3001
```

Expected: scheduled task `LostArk Party Planner Server` exists and starts at boot.

### Task 4: Configure AWS Tunnel Replica

**Files:**
- Modify on VPS: `/opt/lostark-party/.env`
- Create on VPS: `/etc/cloudflared/aws-config.yml`

- [ ] **Step 1: Create the AWS tunnel**

Create a separate locally managed Cloudflare Tunnel named:

```text
lostark-party-aws
```

AWS tunnel ingress must route:

```yaml
ingress:
  - hostname: pigs0516.com
    service: http://127.0.0.1:3000
  - hostname: www.pigs0516.com
    service: http://127.0.0.1:3000
  - hostname: aws.pigs0516.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

- [ ] **Step 2: Create fixed AWS DNS route**

Create or update:

```text
aws.pigs0516.com CNAME <aws-tunnel-uuid>.cfargotunnel.com
```

- [ ] **Step 3: Update VPS public URL values**

On the VPS, set:

```text
APP_BASE_URL=https://pigs0516.com
APP_DOMAIN=pigs0516.com
DISCORD_REDIRECT_URI=https://pigs0516.com/api/discord/oauth/callback
```

- [ ] **Step 4: Deploy and install cloudflared service on AWS**

Run on the VPS:

```bash
cd /opt/lostark-party
sudo bash scripts/vps-deploy.sh
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared
curl -I http://127.0.0.1:3000/
curl -I https://aws.pigs0516.com/
```

Expected: local and AWS tunnel health checks return `200`.

### Task 5: Add Scheduled Failover Controller

**Files:**
- Create in AWS Lambda: `lostark-party-failover`
- Use: AWS EventBridge Scheduler

- [ ] **Step 1: Create Lambda environment variables**

```text
PRIMARY_URL=https://pc.pigs0516.com/
BACKUP_URL=https://aws.pigs0516.com/
PUBLIC_HOST=pigs0516.com
PUBLIC_WWW_HOST=www.pigs0516.com
EC2_INSTANCE_ID=<existing EC2 instance ID>
CLOUDFLARE_ZONE_ID=<pigs0516.com zone ID>
PC_TUNNEL_TARGET=<pc-tunnel-uuid>.cfargotunnel.com
AWS_TUNNEL_TARGET=<aws-tunnel-uuid>.cfargotunnel.com
CLOUDFLARE_API_TOKEN=<scoped DNS token>
```

- [ ] **Step 2: Give Lambda least-needed permissions**

Use this IAM permission set:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:StartInstances",
        "ec2:StopInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

- [ ] **Step 3: Run Lambda every five minutes**

Create an EventBridge schedule:

```text
rate(5 minutes)
```

Expected behavior:

```text
If pc.pigs0516.com is healthy:
  point pigs0516.com and www.pigs0516.com to the PC tunnel
  stop EC2 if it is running

If pc.pigs0516.com is unhealthy:
  start EC2 if it is stopped
  point pigs0516.com and www.pigs0516.com to the AWS tunnel
```

### Task 6: Verify Failover

**Files:**
- Use: Cloudflare DNS dashboard
- Use: AWS EC2 console

- [ ] **Step 1: Verify normal PC mode**

Run:

```powershell
curl.exe -I https://pigs0516.com/
```

Expected: `200` while EC2 is stopped.

- [ ] **Step 2: Simulate PC outage**

Stop the local cloudflared connector or local app, then wait for the next EventBridge schedule run.

Expected:

```text
EC2 starts
pigs0516.com CNAME switches to the AWS tunnel
https://pigs0516.com/ returns 200 after AWS boot completes
```

- [ ] **Step 3: Simulate PC recovery**

Start the PC app and PC cloudflared connector again, then wait for the next EventBridge schedule run.

Expected:

```text
pigs0516.com CNAME switches back to the PC tunnel
EC2 stops
https://pigs0516.com/ returns 200
```
