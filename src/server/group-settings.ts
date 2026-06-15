import { writeGroupActivityLog } from "@/server/activity-log";
import { db } from "@/server/db";
import { requireCanManageSettings } from "@/server/group-permissions";

type OperationalSettingsInput = {
  readonly actorMemberId: string;
  readonly groupId: string;
  readonly timetableStartHour: number;
  readonly timetableEndHour: number;
  readonly dailyDiscordSummaryEnabled: boolean;
  readonly dailyDiscordSummaryTime: string;
  readonly raidReminderLeadMinutes: number;
  readonly availabilityChangeNoticeEnabled: boolean;
  readonly discordChannelId?: string | null;
};

export class GroupSettingsValidationError extends Error {
  readonly name = "GroupSettingsValidationError";
}

function parseHour(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 23) {
    throw new GroupSettingsValidationError(`${label}은 0시부터 23시 사이여야 합니다`);
  }
  return value;
}

function parseReminderMinutes(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 1440) {
    throw new GroupSettingsValidationError("알림 시간은 0분부터 1440분 사이여야 합니다");
  }
  return value;
}

function parseTimeText(value: string) {
  const trimmed = value.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    throw new GroupSettingsValidationError("요약 시간은 HH:mm 형식이어야 합니다");
  }

  const [hourText, minuteText] = trimmed.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new GroupSettingsValidationError("요약 시간이 올바르지 않습니다");
  }

  return trimmed;
}

export async function getGroupOperationalSettings(groupId: string) {
  return db.groupSettings.upsert({
    where: { groupId },
    create: { groupId },
    update: {},
  });
}

export async function updateGroupOperationalSettings(
  input: OperationalSettingsInput,
) {
  const actor = await requireCanManageSettings(input.actorMemberId);
  if (actor.groupId !== input.groupId) {
    throw new GroupSettingsValidationError("같은 공대의 설정만 변경할 수 있습니다");
  }

  const settings = await db.groupSettings.upsert({
    where: { groupId: input.groupId },
    create: {
      availabilityChangeNoticeEnabled: input.availabilityChangeNoticeEnabled,
      dailyDiscordSummaryEnabled: input.dailyDiscordSummaryEnabled,
      dailyDiscordSummaryTime: parseTimeText(input.dailyDiscordSummaryTime),
      discordChannelId: input.discordChannelId?.trim() || null,
      groupId: input.groupId,
      raidReminderLeadMinutes: parseReminderMinutes(
        input.raidReminderLeadMinutes,
      ),
      timetableEndHour: parseHour(input.timetableEndHour, "종료 시간"),
      timetableStartHour: parseHour(input.timetableStartHour, "시작 시간"),
    },
    update: {
      availabilityChangeNoticeEnabled: input.availabilityChangeNoticeEnabled,
      dailyDiscordSummaryEnabled: input.dailyDiscordSummaryEnabled,
      dailyDiscordSummaryTime: parseTimeText(input.dailyDiscordSummaryTime),
      discordChannelId: input.discordChannelId?.trim() || null,
      raidReminderLeadMinutes: parseReminderMinutes(
        input.raidReminderLeadMinutes,
      ),
      timetableEndHour: parseHour(input.timetableEndHour, "종료 시간"),
      timetableStartHour: parseHour(input.timetableStartHour, "시작 시간"),
    },
  });

  await writeGroupActivityLog({
    actionType: "GROUP_SETTINGS_UPDATED",
    actorMemberId: input.actorMemberId,
    groupId: input.groupId,
    summary: "공대 운영 설정을 변경했습니다",
    targetId: settings.id,
    targetType: "GroupSettings",
  });

  return settings;
}
