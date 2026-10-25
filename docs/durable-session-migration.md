# Durable session deployment

This release adds AuthSession with a one-owner check, cascading owner relations, and expiry indexes. It does not migrate business records. Cookies contain random 256-bit tokens; only SHA-256 digests and seven-day expiry are stored. Logout deletes the matching server record, including copied cookies on other processes. Linked memberships require both a valid user session and a matching membership. Unlinked anonymous memberships remain structurally supported only with a newly issued opaque member session; old signed cookies cannot be converted to trusted ownership. Current public join/create flows require account login.

## Required order and blocking guard

1. Preserve a verified database backup and the currently deployed image digest. Read-only count anonymous members (userId IS NULL), and confirm a recovery/claim process before cutting over if any still rely on old cookies. Never infer ownership from a nickname or email claim.
2. Review and approve migration 20261026180000_durable_auth_sessions separately. Run it on a restored isolated database and verify the full test suite before production.
3. Apply the additive migration using the existing protected migration process. This is an operational database change, not authorized by merging this source PR alone. If a lock timeout occurs, stop and roll back the transaction; do not remove timeout guards.
4. Existing scripts/deploy-aws-app.sh compares every prisma file checksum against the running image and returns SCHEMA_CHANGE_BLOCKED before replacing containers on a mismatch. It has no override. Thus an automatic main artifact with this schema cannot be deployed by the ordinary app-only updater. Do not change its reference checksums merely to pass the gate.
5. After the reviewed migration succeeds, the operator must use a separately reviewed one-time release procedure to install the tested session image and establish its schema baseline. Retain the generic app-only guard. A matching checksum alone is not proof that the migration was applied.
6. Users must sign in once because all old signed-ID cookies are rejected. Verify sign-in, group selection, expiry, logout/copy replay, anonymous-member handling (if applicable), and two independent workers sharing the DB. No DNS, Tailscale, or other project changes are needed.

## Rollback

The table is additive: leave it present if rolling back the image, so business data and migration history remain consistent. An old image ignores it but reintroduces replayable non-expiring sessions; prefer fix-forward. A full schema rollback requires stopping all new-version writers first and separately approving DROP TABLE AuthSession plus migration-history reconciliation; it destroys active sessions, not business records. Never run destructive rollback SQL automatically. Database backup restoration is a separate last-resort decision because it may discard unrelated writes.

Expired records are denied on every request. An operator may periodically delete only expired AuthSession rows through the protected maintenance process; no global cleanup job or live DDL is introduced here.
