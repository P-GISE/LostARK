import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCharacter } from "@/server/characters";
import { db } from "@/server/db";
import { createGroup, createGroupWithLeader } from "@/server/groups";
import { connectDiscordMember, joinGroupByInvite } from "@/server/members";
import {
  createNotificationJob,
  markNotificationFailed,
  sendTestNotificationDm,
  shouldSendNotificationJob,
  takeDueNotificationJobs,
} from "@/server/notifications";
import { createRaidTemplate } from "@/server/raid-templates";
import {
  assignScheduleSlot,
  createScheduleFromTemplate,
  setScheduleAttendance,
} from "@/server/schedules";

const mocks = vi.hoisted(() => ({
  sendDiscordDm: vi.fn(),
}));

vi.mock("@/server/discord", () => ({
  sendDiscordDm: mocks.sendDiscordDm,
}));

describe("notifications", () => {
  beforeEach(async () => {
    await db.notificationJob.deleteMany();
    mocks.sendDiscordDm.mockReset();
  });

  it("queues and takes due notification jobs", async () => {
    const group = await createGroup({ name: "공대" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "알림대상",
    });

    const job = await createNotificationJob({
      groupId: group.id,
      memberId: member.id,
      scheduleId: null,
      type: "MISSING_AVAILABILITY",
      message: "가능 시간을 입력해 주세요",
      sendAfter: new Date("2026-06-04T12:00:00+09:00"),
    });

    const jobs = await takeDueNotificationJobs(
      new Date("2026-06-04T12:01:00+09:00"),
    );
    const matchingJobs = jobs.filter((dueJob) => dueJob.id === job.id);

    expect(matchingJobs).toHaveLength(1);
    expect(matchingJobs[0].member.nickname).toBe("알림대상");
  });

  it("records failure without deleting job", async () => {
    const group = await createGroup({ name: "공대" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "디스코드없음",
    });
    const job = await createNotificationJob({
      groupId: group.id,
      memberId: member.id,
      scheduleId: null,
      type: "REMINDER",
      message: "곧 레이드가 시작됩니다",
      sendAfter: new Date("2026-06-04T12:00:00+09:00"),
    });

    const failed = await markNotificationFailed(
      job.id,
      "디스코드가 연결되어 있지 않습니다",
    );

    expect(failed.status).toBe("PENDING");
    expect(failed.failureReason).toBe("디스코드가 연결되어 있지 않습니다");
    expect(failed.attempts).toBe(1);
  });

  it("keeps failed notification jobs pending until the retry limit", async () => {
    const group = await createGroup({ name: "Retry Group" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "RetryTarget",
    });
    const job = await createNotificationJob({
      groupId: group.id,
      memberId: member.id,
      scheduleId: null,
      type: "REMINDER",
      message: "곧 레이드가 시작됩니다",
      sendAfter: new Date("2026-06-04T12:00:00+09:00"),
    });

    const firstFailure = await markNotificationFailed(job.id, "일시 실패");
    const retryJobs = await takeDueNotificationJobs(
      new Date("2026-06-04T12:01:00+09:00"),
    );
    await markNotificationFailed(job.id, "두 번째 실패");
    const finalFailure = await markNotificationFailed(job.id, "세 번째 실패");

    expect(firstFailure.status).toBe("PENDING");
    expect(retryJobs.map((retryJob) => retryJob.id)).toContain(job.id);
    expect(finalFailure.status).toBe("FAILED");
    expect(finalFailure.attempts).toBe(3);
  });

  it("sends a test Discord DM for a connected member", async () => {
    const group = await createGroup({ name: "DM Test Group" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "DmTarget",
    });
    await connectDiscordMember({
      memberId: member.id,
      discordUserId: "1234567890",
    });

    await expect(sendTestNotificationDm(member.id)).resolves.toEqual({
      ok: true,
      error: "",
    });

    expect(mocks.sendDiscordDm).toHaveBeenCalledWith(
      "1234567890",
      expect.stringContaining("테스트"),
    );
  });

  it("does not send a test Discord DM before the member connects Discord", async () => {
    const group = await createGroup({ name: "No DM Group" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "NoDmTarget",
    });

    await expect(sendTestNotificationDm(member.id)).resolves.toEqual({
      ok: false,
      error: "디스코드 계정이 연결되어 있지 않습니다.",
    });

    expect(mocks.sendDiscordDm).not.toHaveBeenCalled();
  });

  it("sends reminder jobs only to members participating in the schedule", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Reminder Static",
      leaderNickname: "ReminderLead",
    });
    const acceptedMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "AcceptedMember",
    });
    const assignedMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "AssignedMember",
    });
    const idleMember = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "IdleMember",
    });
    for (const [member, discordUserId] of [
      [leader, "discord-leader"],
      [acceptedMember, "discord-accepted"],
      [assignedMember, "discord-assigned"],
      [idleMember, "discord-idle"],
    ] as const) {
      await connectDiscordMember({ memberId: member.id, discordUserId });
    }
    const assignedCharacter = await createCharacter({
      memberId: assignedMember.id,
      name: "AssignedChar",
      className: "Bard",
      itemLevel: 1680,
      preferredRole: "SUPPORT",
      notes: "",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "지평의 성당",
      difficulty: "3단계",
      gates: "1-2",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "Support 1",
          role: "SUPPORT",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "지평의 성당 3단계",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });
    await setScheduleAttendance({
      memberId: acceptedMember.id,
      memo: "",
      scheduleId: schedule.id,
      status: "ACCEPTED",
    });
    await assignScheduleSlot({
      slotId: schedule.slots[0].id,
      memberId: assignedMember.id,
      characterId: assignedCharacter.id,
    });
    const reminderJobs = await db.notificationJob.findMany({
      where: { scheduleId: schedule.id, type: "REMINDER" },
    });
    const reminderFor = (memberId: string) => {
      const job = reminderJobs.find((entry) => entry.memberId === memberId);
      if (!job) {
        throw new Error(`Missing reminder job for ${memberId}`);
      }
      return job;
    };

    await expect(
      shouldSendNotificationJob(reminderFor(acceptedMember.id)),
    ).resolves.toBe(true);
    await expect(
      shouldSendNotificationJob(reminderFor(assignedMember.id)),
    ).resolves.toBe(true);
    await expect(
      shouldSendNotificationJob(reminderFor(idleMember.id)),
    ).resolves.toBe(false);
  });
});
