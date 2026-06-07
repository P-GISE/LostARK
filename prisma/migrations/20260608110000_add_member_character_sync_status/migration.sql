ALTER TABLE "Member"
  ADD COLUMN "characterSyncFailedAt" TIMESTAMP(3),
  ADD COLUMN "characterSyncFailureReason" TEXT;
