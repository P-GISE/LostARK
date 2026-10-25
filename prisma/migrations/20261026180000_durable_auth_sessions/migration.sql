BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
CREATE TABLE "AuthSession" (
 "tokenHash" TEXT NOT NULL PRIMARY KEY,
 "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
 "memberId" TEXT REFERENCES "Member"("id") ON DELETE CASCADE,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuthSession_one_owner" CHECK (
  ("userId" IS NOT NULL AND "memberId" IS NULL) OR
  ("userId" IS NULL AND "memberId" IS NOT NULL)
 )
);
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_memberId_idx" ON "AuthSession"("memberId");
COMMIT;
