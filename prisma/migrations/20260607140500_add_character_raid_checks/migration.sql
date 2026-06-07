CREATE TABLE "CharacterRaidCheck" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "raidTemplateId" TEXT NOT NULL,
    "weekStartDate" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterRaidCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CharacterRaidCheck_raidTemplateId_idx" ON "CharacterRaidCheck"("raidTemplateId");
CREATE INDEX "CharacterRaidCheck_weekStartDate_idx" ON "CharacterRaidCheck"("weekStartDate");
CREATE UNIQUE INDEX "CharacterRaidCheck_characterId_raidTemplateId_weekStartDate_key" ON "CharacterRaidCheck"("characterId", "raidTemplateId", "weekStartDate");

ALTER TABLE "CharacterRaidCheck" ADD CONSTRAINT "CharacterRaidCheck_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterRaidCheck" ADD CONSTRAINT "CharacterRaidCheck_raidTemplateId_fkey" FOREIGN KEY ("raidTemplateId") REFERENCES "RaidTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
