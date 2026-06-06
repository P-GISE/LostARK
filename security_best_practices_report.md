# Security Best Practices Report

Date: 2026-06-06
Scope: Lost Ark party planner web app, server actions, OAuth callback, share URL generation, notification history, and baseline HTTP headers.

## Fixed Issues

### High - Discord OAuth account-linking CSRF

Attack path: an attacker could reuse or forge the OAuth `state` value because it was a raw member id. That could link a Discord account to the wrong site member if a victim opened a crafted callback URL.

Fix:
- OAuth `state` is now signed with the server session secret.
- The state payload expires after 10 minutes.
- The callback requires the signed state member id to match the currently logged-in member.
- Unsigned, expired, or mismatched state values fail without calling the account-linking write.

### High - Host header poisoning in redirects and invite URLs

Attack path: an attacker could send a forged `Host` or `X-Forwarded-Host` header and make generated links or OAuth callback redirects point to an attacker-controlled domain.

Fix:
- Request hosts are accepted only when they are local or explicitly allowlisted.
- `APP_BASE_URL` remains the preferred public URL when configured.
- URL-form and host-form allowlist values are both supported.

### Medium - Non-leader schedule creation

Attack path: a normal member could call the server action directly and create schedules, which also triggers Discord notification jobs.

Fix:
- Server-side schedule creation now requires a member with `role: "LEADER"` in the same group.
- The schedules page hides the creation form from non-leaders and shows a clear empty state.

### Medium - Notification history disclosure

Attack path: a normal member could view group-wide notification jobs, including other members' notification status and failure reason text.

Fix:
- Leaders can still view the group notification history.
- Non-leaders are limited to their own notification jobs.

### Medium - Missing baseline browser security headers

Attack path: missing headers increased exposure to clickjacking, content-type confusion, broad referrer leakage, and unnecessary browser capabilities.

Fix:
- Added global security headers:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`

## Regression Coverage

Added or updated tests for:
- Signed and expiring Discord OAuth state.
- OAuth callback rejection for unsigned and mismatched state.
- Host allowlisting and unallowlisted host rejection.
- Leader-only schedule creation.
- Non-leader notification history scoping.
- Global security headers.

## Server Verification

Checked `https://lostark-party.tail408126.ts.net/auth/login` on 2026-06-06:
- The server returned `200 OK`.
- The deployed response did not include the new CSP, `X-Frame-Options`, or `X-Content-Type-Options` headers.
- The OAuth callback redirect stayed on `https://lostark-party.tail408126.ts.net` even when `X-Forwarded-Host: evil.example` was sent.

Conclusion: the deployed server is reachable, but the running Node process has not picked up the latest local build. Restarting the production Node process on port 3000 is required before the header hardening is live on the server.

Follow-up incident:
- Existing browser cookies triggered `500 Internal Server Error` because the production process did not have `SESSION_SECRET`.
- Added a strong `SESSION_SECRET` to the local production `.env`.
- Hardened cookie verification so missing production secret treats old cookies as invalid instead of throwing a page-level server error.
- Added a `-Restart` option to `scripts/start-prod-server.ps1`; an elevated PowerShell session is still required to restart the SYSTEM-owned Node process.

## Remaining Recommendations

- Add rate limiting for login, invite join, Discord OAuth callback, and test DM endpoints.
- Add production monitoring for repeated OAuth callback failures and notification send failures.
- Keep `SESSION_SECRET`, Discord OAuth secrets, and Lost Ark API keys out of source control and rotate them if they were ever shared.
- Consider a stricter CSP with per-script nonces once the deployment is stable enough to tune it without breaking Next.js runtime scripts.
