import { db } from "@/server/db";
import { sendDiscordDm } from "@/server/discord";

export async function createNotificationJob(input: {
  groupId: string;
  memberId: string;
  scheduleId: string | null;
  type: string;
  message: string;
  sendAfter: Date;
}) {
  return db.notificationJob.create({
    data: {
      groupId: input.groupId,
      memberId: input.memberId,
      scheduleId: input.scheduleId,
      type: input.type,
      message: input.message,
      sendAfter: input.sendAfter,
    },
  });
}

function formatScheduleTime(startsAt: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(startsAt);
}

function formatRaidSummary(input: {
  difficulty?: string;
  gates?: string;
  templateName?: string;
  title: string;
}) {
  const raidName = [input.templateName, input.difficulty]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const gateText = input.gates?.trim() ? `${input.gates.trim()}관문` : "";
  const summary = [raidName, gateText].filter(Boolean).join(" · ");

  return summary || input.title.trim();
}

function buildScheduleCreatedMessage(input: {
  difficulty?: string;
  gates?: string;
  scheduleTime: string;
  templateName?: string;
  title: string;
}) {
  return [
    "[로스트아크 공대관리] 새 일정이 생성되었습니다.",
    formatRaidSummary(input),
    `시간: ${input.scheduleTime}`,
    `일정명: ${input.title}`,
  ].join("\n");
}

function buildScheduleReminderMessage(input: {
  difficulty?: string;
  gates?: string;
  scheduleTime: string;
  templateName?: string;
  title: string;
}) {
  return [
    "[로스트아크 공대관리] 1시간 후 일정이 시작됩니다.",
    formatRaidSummary(input),
    `시간: ${input.scheduleTime}`,
    `일정명: ${input.title}`,
  ].join("\n");
}

export async function queueScheduleNotificationJobs(input: {
  difficulty?: string;
  gates?: string;
  groupId: string;
  scheduleId: string;
  templateName?: string;
  title: string;
  startsAt: Date;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const reminderAt = new Date(input.startsAt.getTime() - 60 * 60 * 1000);
  const sendReminderAt = reminderAt > now ? reminderAt : now;
  const scheduleTime = formatScheduleTime(input.startsAt);
  const scheduleMessage = {
    difficulty: input.difficulty,
    gates: input.gates,
    scheduleTime,
    templateName: input.templateName,
    title: input.title,
  };
  const members = await db.member.findMany({
    where: {
      groupId: input.groupId,
      discordUserId: { not: null },
    },
    select: { id: true },
  });

  if (members.length === 0) {
    return { count: 0 };
  }

  return db.notificationJob.createMany({
    data: members.flatMap((member) => [
      {
        groupId: input.groupId,
        memberId: member.id,
        scheduleId: input.scheduleId,
        type: "SCHEDULE_CREATED",
        message: buildScheduleCreatedMessage(scheduleMessage),
        sendAfter: now,
      },
      {
        groupId: input.groupId,
        memberId: member.id,
        scheduleId: input.scheduleId,
        type: "REMINDER",
        message: buildScheduleReminderMessage(scheduleMessage),
        sendAfter: sendReminderAt,
      },
    ]),
  });
}

export async function shouldSendNotificationJob(job: {
  memberId: string;
  scheduleId: string | null;
  type: string;
}) {
  if (job.type !== "REMINDER" || !job.scheduleId) {
    return true;
  }

  const schedule = await db.schedule.findUnique({
    where: { id: job.scheduleId },
    select: {
      status: true,
      attendances: {
        where: {
          memberId: job.memberId,
          status: "ACCEPTED",
        },
        select: { id: true },
        take: 1,
      },
      slots: {
        where: { assignedMemberId: job.memberId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!schedule || schedule.status === "CANCELED") {
    return false;
  }

  return schedule.attendances.length > 0 || schedule.slots.length > 0;
}

export async function sendTestNotificationDm(memberId: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { discordUserId: true },
  });

  if (!member?.discordUserId) {
    return {
      ok: false,
      error: "디스코드 계정이 연결되어 있지 않습니다.",
    };
  }

  await sendDiscordDm(
    member.discordUserId,
    "[로스트아크 공대관리] 테스트 DM입니다. 알림 설정이 정상입니다.",
  );

  return { ok: true, error: "" };
}

export async function takeDueNotificationJobs(now = new Date()) {
  return db.notificationJob.findMany({
    where: {
      status: "PENDING",
      sendAfter: { lte: now },
      attempts: { lt: 3 },
    },
    include: { member: true },
    orderBy: { sendAfter: "asc" },
    take: 20,
  });
}

export async function markNotificationSent(jobId: string) {
  return db.notificationJob.update({
    where: { id: jobId },
    data: {
      status: "SENT",
      failureReason: null,
    },
  });
}

export async function markNotificationCanceled(jobId: string, reason = "") {
  return db.notificationJob.update({
    where: { id: jobId },
    data: {
      status: "CANCELED",
      failureReason: reason.trim() || null,
    },
  });
}

export async function markNotificationFailed(jobId: string, reason: string) {
  const job = await db.notificationJob.findUnique({
    where: { id: jobId },
    select: { attempts: true },
  });
  if (!job) {
    throw new Error("알림 작업을 찾을 수 없습니다.");
  }

  const nextAttempts = job.attempts + 1;

  return db.notificationJob.update({
    where: { id: jobId },
    data: {
      status: nextAttempts >= 3 ? "FAILED" : "PENDING",
      failureReason: reason,
      attempts: { increment: 1 },
    },
  });
}
