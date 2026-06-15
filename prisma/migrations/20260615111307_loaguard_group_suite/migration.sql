-- CreateEnum
CREATE TYPE "RaidSetStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'CONFIRMED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AvailabilityPresetMode" AS ENUM ('WEEKLY', 'CYCLE');

-- CreateEnum
CREATE TYPE "RaidSignupStatus" AS ENUM ('OPEN', 'ASSIGNING', 'FINALIZED', 'CANCELED');

-- CreateEnum
CREATE TYPE "RaidSignupEntryStatus" AS ENUM ('APPLIED', 'CANCELED', 'ASSIGNED', 'FAILED');

-- CreateTable
CREATE TABLE "GroupSettings" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "timetableStartHour" INTEGER NOT NULL DEFAULT 8,
    "timetableEndHour" INTEGER NOT NULL DEFAULT 4,
    "dailyDiscordSummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyDiscordSummaryTime" TEXT NOT NULL DEFAULT '09:00',
    "raidReminderLeadMinutes" INTEGER NOT NULL DEFAULT 60,
    "availabilityChangeNoticeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "discordChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPermission" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "canManageSets" BOOLEAN NOT NULL DEFAULT false,
    "canConfirmSchedules" BOOLEAN NOT NULL DEFAULT false,
    "canEditSchedules" BOOLEAN NOT NULL DEFAULT false,
    "canManageHomeworkForOthers" BOOLEAN NOT NULL DEFAULT false,
    "canManageSettings" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MemberPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupActivityLog" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "actorMemberId" TEXT,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidSet" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weekStartDate" TEXT NOT NULL,
    "status" "RaidSetStatus" NOT NULL DEFAULT 'DRAFT',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "scheduledStartsAt" TIMESTAMP(3),
    "createdByMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidSetSlot" (
    "id" TEXT NOT NULL,
    "raidSetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "role" "SlotRole" NOT NULL,
    "assignedMemberId" TEXT,
    "assignedCharacterId" TEXT,
    "absent" BOOLEAN NOT NULL DEFAULT false,
    "absentReason" TEXT NOT NULL DEFAULT '',
    "roleOverride" "SlotRole",

    CONSTRAINT "RaidSetSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityPreset" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "AvailabilityPresetMode" NOT NULL,
    "cycleDays" INTEGER,
    "anchorDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityPresetSlot" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "cycleDay" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "AvailabilityPresetSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityWeekOverride" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weekStartDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityWeekOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidSignup" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekStartDate" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "maxParties" INTEGER NOT NULL,
    "status" "RaidSignupStatus" NOT NULL DEFAULT 'OPEN',
    "createdByMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidSignupEntry" (
    "id" TEXT NOT NULL,
    "signupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "RaidSignupEntryStatus" NOT NULL DEFAULT 'APPLIED',
    "memo" TEXT NOT NULL DEFAULT '',
    "assignedRaidSetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidSignupEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidSignupAssignment" (
    "id" TEXT NOT NULL,
    "signupId" TEXT NOT NULL,
    "raidSetId" TEXT NOT NULL,
    "partyNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidSignupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupSettings_groupId_key" ON "GroupSettings"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberPermission_memberId_key" ON "MemberPermission"("memberId");

-- CreateIndex
CREATE INDEX "GroupActivityLog_groupId_createdAt_idx" ON "GroupActivityLog"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "RaidSet_groupId_weekStartDate_idx" ON "RaidSet"("groupId", "weekStartDate");

-- CreateIndex
CREATE INDEX "RaidSet_templateId_idx" ON "RaidSet"("templateId");

-- CreateIndex
CREATE INDEX "RaidSetSlot_raidSetId_order_idx" ON "RaidSetSlot"("raidSetId", "order");

-- CreateIndex
CREATE INDEX "AvailabilityPreset_memberId_idx" ON "AvailabilityPreset"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityWeekOverride_memberId_weekStartDate_key" ON "AvailabilityWeekOverride"("memberId", "weekStartDate");

-- CreateIndex
CREATE INDEX "RaidSignup_groupId_weekStartDate_idx" ON "RaidSignup"("groupId", "weekStartDate");

-- CreateIndex
CREATE INDEX "RaidSignupEntry_memberId_idx" ON "RaidSignupEntry"("memberId");

-- CreateIndex
CREATE INDEX "RaidSignupEntry_assignedRaidSetId_idx" ON "RaidSignupEntry"("assignedRaidSetId");

-- CreateIndex
CREATE UNIQUE INDEX "RaidSignupEntry_signupId_characterId_key" ON "RaidSignupEntry"("signupId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RaidSignupAssignment_signupId_raidSetId_key" ON "RaidSignupAssignment"("signupId", "raidSetId");

-- AddForeignKey
ALTER TABLE "GroupSettings" ADD CONSTRAINT "GroupSettings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPermission" ADD CONSTRAINT "MemberPermission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupActivityLog" ADD CONSTRAINT "GroupActivityLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupActivityLog" ADD CONSTRAINT "GroupActivityLog_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSet" ADD CONSTRAINT "RaidSet_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSet" ADD CONSTRAINT "RaidSet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RaidTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSet" ADD CONSTRAINT "RaidSet_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSetSlot" ADD CONSTRAINT "RaidSetSlot_raidSetId_fkey" FOREIGN KEY ("raidSetId") REFERENCES "RaidSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSetSlot" ADD CONSTRAINT "RaidSetSlot_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSetSlot" ADD CONSTRAINT "RaidSetSlot_assignedCharacterId_fkey" FOREIGN KEY ("assignedCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityPreset" ADD CONSTRAINT "AvailabilityPreset_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityPresetSlot" ADD CONSTRAINT "AvailabilityPresetSlot_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "AvailabilityPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityWeekOverride" ADD CONSTRAINT "AvailabilityWeekOverride_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignup" ADD CONSTRAINT "RaidSignup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignup" ADD CONSTRAINT "RaidSignup_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RaidTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignup" ADD CONSTRAINT "RaidSignup_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignupEntry" ADD CONSTRAINT "RaidSignupEntry_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "RaidSignup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignupEntry" ADD CONSTRAINT "RaidSignupEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignupEntry" ADD CONSTRAINT "RaidSignupEntry_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignupEntry" ADD CONSTRAINT "RaidSignupEntry_assignedRaidSetId_fkey" FOREIGN KEY ("assignedRaidSetId") REFERENCES "RaidSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignupAssignment" ADD CONSTRAINT "RaidSignupAssignment_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "RaidSignup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignupAssignment" ADD CONSTRAINT "RaidSignupAssignment_raidSetId_fkey" FOREIGN KEY ("raidSetId") REFERENCES "RaidSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
