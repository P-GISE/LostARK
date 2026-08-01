ALTER TABLE "GroupSettings"
ADD COLUMN "discordGuildId" TEXT,
ADD COLUMN "discordRecruitmentChannelId" TEXT,
ADD COLUMN "discordAnnouncementChannelId" TEXT;

ALTER TABLE "RaidTemplate"
ADD COLUMN "minimumItemLevel" DOUBLE PRECISION,
ADD COLUMN "minimumCombatPower" INTEGER,
ADD COLUMN "readinessNotes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "RaidSignup"
ADD COLUMN "discordGuildId" TEXT,
ADD COLUMN "discordChannelId" TEXT,
ADD COLUMN "discordMessageId" TEXT,
ADD COLUMN "discordPostedAt" TIMESTAMP(3),
ADD COLUMN "discordClosedAt" TIMESTAMP(3);

CREATE TABLE "BotOutboxMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "discordGuildId" TEXT NOT NULL,
    "discordChannelId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotOutboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotOutboxMessage_status_createdAt_idx" ON "BotOutboxMessage"("status", "createdAt");

CREATE INDEX "BotOutboxMessage_groupId_idx" ON "BotOutboxMessage"("groupId");

ALTER TABLE "BotOutboxMessage" ADD CONSTRAINT "BotOutboxMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
