import { SlotRole } from "@prisma/client";
import { db } from "@/server/db";
import {
  LOSTARK_RAID_TEMPLATE_PRESETS,
  type LostArkRaidPreset,
} from "@/server/lostark-raid-presets";

export async function createRaidTemplate(input: {
  groupId: string;
  name: string;
  difficulty: string;
  gates: string;
  requiredPlayers: number;
  requirements: string;
  notes: string;
  slots: Array<{
    label: string;
    role: keyof typeof SlotRole;
    required: boolean;
    classPreference: string;
    notes: string;
  }>;
}) {
  if (!Number.isInteger(input.requiredPlayers) || input.requiredPlayers < 1) {
    throw new Error("템플릿에는 최소 한 명이 필요합니다");
  }
  if (input.slots.length === 0) {
    throw new Error("템플릿에는 최소 한 자리가 필요합니다");
  }
  if (input.slots.length !== input.requiredPlayers) {
    throw new Error("필요 인원과 자리 수가 일치해야 합니다");
  }

  return db.raidTemplate.create({
    data: {
      groupId: input.groupId,
      name: input.name.trim(),
      difficulty: input.difficulty.trim(),
      gates: input.gates.trim(),
      requiredPlayers: input.requiredPlayers,
      requirements: input.requirements.trim(),
      notes: input.notes.trim(),
      slots: {
        create: input.slots.map((slot) => ({
          label: slot.label.trim(),
          role: slot.role,
          required: slot.required,
          classPreference: slot.classPreference.trim() || null,
          notes: slot.notes.trim(),
        })),
      },
    },
    include: { slots: true },
  });
}

async function requireTemplateLeader(input: {
  actorMemberId: string;
  groupId: string;
}) {
  const leader = await db.member.findFirst({
    where: {
      id: input.actorMemberId,
      groupId: input.groupId,
      role: "LEADER",
    },
  });

  if (!leader) {
    throw new Error("공대장만 템플릿을 관리할 수 있습니다");
  }
}

export async function createRaidTemplateForLeader(input: {
  actorMemberId: string;
  groupId: string;
  name: string;
  difficulty: string;
  gates: string;
  requiredPlayers: number;
  requirements: string;
  notes: string;
  slots: Array<{
    label: string;
    role: keyof typeof SlotRole;
    required: boolean;
    classPreference: string;
    notes: string;
  }>;
}) {
  await requireTemplateLeader(input);
  return createRaidTemplate(input);
}

function buildDefaultSlots(preset: LostArkRaidPreset) {
  const dpsSlots = preset.requiredPlayers - preset.supportSlots;

  return [
    ...Array.from({ length: dpsSlots }, (_, index) => ({
      label: `딜러 ${index + 1}`,
      role: "DPS" as const,
      required: true,
      classPreference: "",
      notes: "",
    })),
    ...Array.from({ length: preset.supportSlots }, (_, index) => ({
      label: `서폿 ${index + 1}`,
      role: "SUPPORT" as const,
      required: true,
      classPreference: "",
      notes: "",
    })),
  ];
}

function templateKey(input: {
  name: string;
  difficulty: string;
  gates: string;
}) {
  return `${input.name.trim()}::${input.difficulty.trim()}::${input.gates.trim()}`;
}

function presetTemplateData(preset: LostArkRaidPreset) {
  return {
    name: preset.name,
    difficulty: preset.difficulty,
    gates: preset.gates,
    requiredPlayers: preset.requiredPlayers,
    requirements: preset.requirements,
    notes: preset.notes,
  };
}

function slotCreateData(
  templateId: string,
  slot: ReturnType<typeof buildDefaultSlots>[number],
) {
  return {
    templateId,
    label: slot.label.trim(),
    role: slot.role,
    required: slot.required,
    classPreference: slot.classPreference.trim() || null,
    notes: slot.notes.trim(),
  };
}

function slotUpdateData(slot: ReturnType<typeof buildDefaultSlots>[number]) {
  return {
    label: slot.label.trim(),
    role: slot.role,
    required: slot.required,
    classPreference: slot.classPreference.trim() || null,
    notes: slot.notes.trim(),
  };
}

async function updateLegacyRaidTemplateToPreset(input: {
  templateId: string;
  preset: LostArkRaidPreset;
}) {
  const desiredSlots = buildDefaultSlots(input.preset);

  await db.$transaction(async (tx) => {
    const existingSlots = await tx.raidTemplateSlot.findMany({
      where: { templateId: input.templateId },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const referencedSlotCount =
      existingSlots.length === 0
        ? 0
        : await tx.scheduleSlot.count({
            where: {
              templateSlotId: { in: existingSlots.map((slot) => slot.id) },
            },
          });

    await tx.raidTemplate.update({
      where: { id: input.templateId },
      data: presetTemplateData(input.preset),
    });

    if (referencedSlotCount === 0) {
      await tx.raidTemplateSlot.deleteMany({
        where: { templateId: input.templateId },
      });
      await tx.raidTemplateSlot.createMany({
        data: desiredSlots.map((slot) =>
          slotCreateData(input.templateId, slot),
        ),
      });
      return;
    }

    for (const [index, existingSlot] of existingSlots.entries()) {
      const desiredSlot = desiredSlots[index];
      if (!desiredSlot) {
        break;
      }
      await tx.raidTemplateSlot.update({
        where: { id: existingSlot.id },
        data: slotUpdateData(desiredSlot),
          });
    }

    const surplusSlots = existingSlots.slice(desiredSlots.length);
    if (surplusSlots.length > 0) {
      const surplusSlotIds = surplusSlots.map((slot) => slot.id);
      await tx.scheduleSlot.updateMany({
        where: { templateSlotId: { in: surplusSlotIds } },
        data: { templateSlotId: null },
      });
      await tx.raidTemplateSlot.deleteMany({
        where: { id: { in: surplusSlotIds } },
      });
    }

    if (existingSlots.length < desiredSlots.length) {
      await tx.raidTemplateSlot.createMany({
        data: desiredSlots
          .slice(existingSlots.length)
          .map((slot) => slotCreateData(input.templateId, slot)),
      });
    }
  });
}

type ExistingRaidTemplate = {
  id: string;
  name: string;
  difficulty: string;
  gates: string;
};

function findLegacyTemplateForPreset(
  preset: LostArkRaidPreset,
  templatesByKey: Map<string, ExistingRaidTemplate>,
) {
  for (const legacyKey of preset.legacyKeys ?? []) {
    const key = templateKey(legacyKey);
    const template = templatesByKey.get(key);
    if (template) {
      return { key, template };
    }
  }
  return null;
}

export async function importDefaultRaidTemplatesForGroup(groupId: string) {
  const existingTemplates = await db.raidTemplate.findMany({
    where: { groupId },
    select: {
      id: true,
      name: true,
      difficulty: true,
      gates: true,
    },
  });
  const templatesByKey = new Map<string, ExistingRaidTemplate>();
  for (const template of existingTemplates) {
    const key = templateKey(template);
    if (!templatesByKey.has(key)) {
      templatesByKey.set(key, template);
    }
  }
  const existingKeys = new Set(templatesByKey.keys());
  let createdCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  for (const preset of LOSTARK_RAID_TEMPLATE_PRESETS) {
    const key = templateKey(preset);
    if (existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }

    const legacyTemplate = findLegacyTemplateForPreset(preset, templatesByKey);
    if (legacyTemplate) {
      await updateLegacyRaidTemplateToPreset({
        templateId: legacyTemplate.template.id,
        preset,
      });
      existingKeys.delete(legacyTemplate.key);
      templatesByKey.delete(legacyTemplate.key);
      existingKeys.add(key);
      templatesByKey.set(key, {
        id: legacyTemplate.template.id,
        name: preset.name,
        difficulty: preset.difficulty,
        gates: preset.gates,
      });
      updatedCount += 1;
      continue;
    }

    const created = await createRaidTemplate({
      groupId,
      ...presetTemplateData(preset),
      slots: buildDefaultSlots(preset),
    });
    existingKeys.add(key);
    templatesByKey.set(key, {
      id: created.id,
      name: created.name,
      difficulty: created.difficulty,
      gates: created.gates,
    });
    createdCount += 1;
  }

  return { createdCount, skippedCount, updatedCount };
}

export async function importDefaultRaidTemplatesForLeader(input: {
  actorMemberId: string;
  groupId: string;
}) {
  await requireTemplateLeader(input);
  return importDefaultRaidTemplatesForGroup(input.groupId);
}

export async function deleteRaidTemplate(input: {
  actorMemberId: string;
  templateId: string;
}) {
  const template = await db.raidTemplate.findUnique({
    where: { id: input.templateId },
  });

  if (!template) {
    throw new Error("템플릿을 찾을 수 없습니다");
  }

  await requireTemplateLeader({
    actorMemberId: input.actorMemberId,
    groupId: template.groupId,
  });

  return db.raidTemplate.delete({
    where: { id: input.templateId },
  });
}

export async function listRaidTemplates(groupId: string) {
  return db.raidTemplate.findMany({
    where: { groupId },
    include: { slots: true },
    orderBy: { createdAt: "desc" },
  });
}
