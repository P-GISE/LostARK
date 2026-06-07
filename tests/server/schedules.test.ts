import { describe, expect, it } from "vitest";
import { createCharacter } from "@/server/characters";
import { db } from "@/server/db";
import { createGroup, createGroupWithLeader } from "@/server/groups";
import { connectDiscordMember, joinGroupByInvite } from "@/server/members";
import { createRaidTemplate } from "@/server/raid-templates";
import {
  assignScheduleSlot,
  cancelSchedule,
  createScheduleFromTemplate,
  listScheduleAttendances,
  setScheduleAttendance,
  unassignScheduleSlot,
  updateSchedule,
} from "@/server/schedules";

describe("schedules", () => {
  it("creates schedule slots from a raid template", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Static",
      leaderNickname: "Lead",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Behemoth",
      difficulty: "Normal",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Behemoth Friday",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    expect(schedule.slots).toHaveLength(1);
    expect(schedule.slots[0].label).toBe("DPS 1");
    expect(schedule.notes).toBe("");
  });

  it("adds raid guide notes when creating a schedule from a supported template", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Guide Static",
      leaderNickname: "GuideLead",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "카제로스 2막: 부유하는 악몽의 진혼곡",
      difficulty: "하드",
      gates: "1-2",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Act 2 Guide",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    expect(schedule.notes).toContain("준비물");
    expect(schedule.notes).toContain("공대장 스킬");
    expect(schedule.notes).toContain("카드");
    expect(schedule.notes).toContain("뇌구빛");
    expect(schedule.notes).toContain("니나브");
  });

  it("queues Discord DM notification jobs for group members when a schedule is created", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Notification Static",
      leaderNickname: "NotifyLead",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "NotifyMember",
    });
    await connectDiscordMember({
      memberId: leader.id,
      discordUserId: "1111111111",
    });
    await connectDiscordMember({
      memberId: member.id,
      discordUserId: "2222222222",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Aegir",
      difficulty: "Hard",
      gates: "1-2",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Aegir Saturday",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    const jobs = await db.notificationJob.findMany({
      where: { scheduleId: schedule.id },
      orderBy: [{ memberId: "asc" }, { type: "asc" }],
    });

    expect(jobs).toHaveLength(4);
    expect(jobs.map((job) => job.memberId).sort()).toEqual(
      [leader.id, leader.id, member.id, member.id].sort(),
    );
    expect(jobs.map((job) => job.type).sort()).toEqual([
      "REMINDER",
      "REMINDER",
      "SCHEDULE_CREATED",
      "SCHEDULE_CREATED",
    ]);
  });

  it("rejects schedule creation by non-leaders", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "권한 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "멤버",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    await expect(
      createScheduleFromTemplate({
        groupId: group.id,
        templateId: template.id,
        title: "멤버가 만든 일정",
        startsAt: "2030-06-05T21:00:00+09:00",
        createdByMemberId: member.id,
      }),
    ).rejects.toThrow("공대장만 일정을 만들 수 있습니다");
    await expect(
      createScheduleFromTemplate({
        groupId: group.id,
        templateId: template.id,
        title: "리더가 만든 일정",
        startsAt: "2030-06-05T21:00:00+09:00",
        createdByMemberId: leader.id,
      }),
    ).resolves.toMatchObject({ title: "리더가 만든 일정" });
  });

  it("rejects schedules that start in the past", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Past Schedule",
      leaderNickname: "Lead",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });

    await expect(
      createScheduleFromTemplate({
        groupId: group.id,
        templateId: template.id,
        title: "Past Raid",
        startsAt: "2026-06-07T16:30:00+09:00",
        createdByMemberId: leader.id,
        now: new Date("2026-06-07T07:30:00.000Z"),
      } as Parameters<typeof createScheduleFromTemplate>[0] & { now: Date }),
    ).rejects.toThrow("지난 시간에는 일정을 생성할 수 없습니다");
  });

  it("rejects assigning a character owned by another member", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "Static",
      leaderNickname: "Lead",
    });
    const memberA = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "AA",
    });
    const memberB = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "BB",
    });
    const character = await createCharacter({
      memberId: memberA.id,
      name: "AChar",
      className: "Bard",
      itemLevel: 1640,
      preferredRole: "SUPPORT",
      notes: "",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
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
      title: "Raid",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    await expect(
      assignScheduleSlot({
        slotId: schedule.slots[0].id,
        memberId: memberB.id,
        characterId: character.id,
      }),
    ).rejects.toThrow("선택한 캐릭터가 해당 멤버의 캐릭터가 아닙니다");
  });

  it("rejects slot assignment when the member is outside the schedule group", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "원래 공대",
      leaderNickname: "리더",
    });
    const otherGroup = await createGroup({ name: "다른 공대" });
    const outsider = await joinGroupByInvite({
      inviteCode: otherGroup.inviteCode,
      nickname: "외부인",
    });
    const outsiderCharacter = await createCharacter({
      memberId: outsider.id,
      name: "OtherChar",
      className: "Slayer",
      itemLevel: 1640,
      preferredRole: "DPS",
      notes: "",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Raid",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    await expect(
      assignScheduleSlot({
        slotId: schedule.slots[0].id,
        memberId: outsider.id,
        characterId: outsiderCharacter.id,
      }),
    ).rejects.toThrow("일정이 속한 공대원만 자리를 배정할 수 있습니다");
  });

  it("rejects overwriting another member's assigned slot", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "배정 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "멤버",
    });
    const leaderCharacter = await createCharacter({
      memberId: leader.id,
      name: "LeaderChar",
      className: "Slayer",
      itemLevel: 1640,
      preferredRole: "DPS",
      notes: "",
    });
    const memberCharacter = await createCharacter({
      memberId: member.id,
      name: "MemberChar",
      className: "Bard",
      itemLevel: 1640,
      preferredRole: "SUPPORT",
      notes: "",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Raid",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });
    await assignScheduleSlot({
      slotId: schedule.slots[0].id,
      memberId: leader.id,
      characterId: leaderCharacter.id,
    });

    await expect(
      assignScheduleSlot({
        slotId: schedule.slots[0].id,
        memberId: member.id,
        characterId: memberCharacter.id,
      }),
    ).rejects.toThrow("이미 다른 공대원이 배정된 자리입니다");
  });

  it("updates and cancels schedules by the leader", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "공대",
      leaderNickname: "리더",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Old title",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    const updated = await updateSchedule({
      actorMemberId: leader.id,
      scheduleId: schedule.id,
      title: "New title",
      startsAt: "2030-06-06T21:00:00+09:00",
      notes: "시간 변경",
    });
    const canceled = await cancelSchedule({
      actorMemberId: leader.id,
      scheduleId: schedule.id,
    });

    expect(updated.title).toBe("New title");
    expect(updated.notes).toBe("시간 변경");
    expect(canceled.status).toBe("CANCELED");
  });

  it("unassigns a schedule slot", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "공대",
      leaderNickname: "리더",
    });
    const character = await createCharacter({
      memberId: leader.id,
      name: "LeaderChar",
      className: "Slayer",
      itemLevel: 1640,
      preferredRole: "DPS",
      notes: "",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "Raid",
      difficulty: "Hard",
      gates: "1",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "DPS 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "Raid",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });
    const assigned = await assignScheduleSlot({
      slotId: schedule.slots[0].id,
      memberId: leader.id,
      characterId: character.id,
    });

    const unassigned = await unassignScheduleSlot({
      actorMemberId: leader.id,
      slotId: assigned.id,
    });

    expect(unassigned.assignedMemberId).toBeNull();
    expect(unassigned.assignedCharacterId).toBeNull();
    expect(unassigned.confirmationStatus).toBe("PENDING");
  });

  it("lets each group member check attendance for a schedule", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "체크 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "참석자",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "카멘",
      difficulty: "하드",
      gates: "1-4",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "딜러 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "카멘 하드",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    const checked = await setScheduleAttendance({
      memberId: member.id,
      memo: "10분 전 접속",
      scheduleId: schedule.id,
      status: "ACCEPTED",
    });

    expect(checked.status).toBe("ACCEPTED");
    expect(checked.memo).toBe("10분 전 접속");

    const changed = await setScheduleAttendance({
      memberId: member.id,
      memo: "늦을 수 있음",
      scheduleId: schedule.id,
      status: "TENTATIVE",
    });
    const attendances = await listScheduleAttendances(schedule.id);

    expect(changed.status).toBe("TENTATIVE");
    expect(attendances).toHaveLength(1);
    expect(attendances[0].member.nickname).toBe("참석자");
    expect(attendances[0].status).toBe("TENTATIVE");
  });

  it("rejects attendance checks from members outside the schedule group", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "원래 공대",
      leaderNickname: "리더",
    });
    const otherGroup = await createGroup({ name: "다른 공대" });
    const outsider = await joinGroupByInvite({
      inviteCode: otherGroup.inviteCode,
      nickname: "외부인",
    });
    const template = await createRaidTemplate({
      groupId: group.id,
      name: "카멘",
      difficulty: "하드",
      gates: "1-4",
      requiredPlayers: 1,
      requirements: "",
      notes: "",
      slots: [
        {
          label: "딜러 1",
          role: "DPS",
          required: true,
          classPreference: "",
          notes: "",
        },
      ],
    });
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: "카멘 하드",
      startsAt: "2030-06-05T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    await expect(
      setScheduleAttendance({
        memberId: outsider.id,
        memo: "",
        scheduleId: schedule.id,
        status: "ACCEPTED",
      }),
    ).rejects.toThrow("일정이 속한 공대원만 참석 체크를 할 수 있습니다");
  });
});
