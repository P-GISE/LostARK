import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createUser } from "@/server/accounts";
import { setAvailabilitySlot } from "@/server/availability";
import {
  deleteAdminGroup,
  deleteAdminSchedule,
  deleteAdminUser,
  getAdminOverview,
  isAdminEmail,
} from "@/server/admin";
import { createCharacter } from "@/server/characters";
import { db } from "@/server/db";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { createNotificationJob } from "@/server/notifications";
import { listRaidTemplates } from "@/server/raid-templates";
import {
  assignScheduleSlot,
  createScheduleFromTemplate,
  setScheduleAttendance,
} from "@/server/schedules";

describe("admin", () => {
  it("matches admin emails case-insensitively from ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "Owner@Example.com, second@example.com";

    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("SECOND@example.com")).toBe(true);
    expect(isAdminEmail("member@example.com")).toBe(false);
  });

  it("returns global users and raid groups for the operator dashboard", async () => {
    const id = randomUUID();
    const leaderUser = await createUser({
      email: `admin-leader-${id}@example.com`,
      password: "password123",
      displayName: "Admin Leader",
    });
    const memberUser = await createUser({
      email: `admin-member-${id}@example.com`,
      password: "password123",
      displayName: "Admin Member",
    });
    const { group } = await createGroupWithLeader({
      groupName: `Admin Static ${id}`,
      leaderNickname: "Leader",
      userId: leaderUser.id,
    });
    await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Member",
      userId: memberUser.id,
    });

    const overview = await getAdminOverview();

    expect(overview.metrics.totalUsers).toBeGreaterThanOrEqual(2);
    expect(overview.metrics.totalGroups).toBeGreaterThanOrEqual(1);
    expect(overview.metrics.totalMembers).toBeGreaterThanOrEqual(2);
    expect(overview.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: group.id,
          name: group.name,
          memberCount: 2,
          leaderNames: ["Leader"],
        }),
      ]),
    );
    expect(overview.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: leaderUser.id,
          email: leaderUser.email,
          displayName: "Admin Leader",
          membershipCount: 1,
        }),
        expect.objectContaining({
          id: memberUser.id,
          email: memberUser.email,
          displayName: "Admin Member",
          membershipCount: 1,
        }),
      ]),
    );
  });

  it("deletes schedules, groups, and login users only for configured admins", async () => {
    const id = randomUUID();
    const adminEmail = `cleanup-admin-${id}@example.com`;
    process.env.ADMIN_EMAILS = adminEmail;
    const user = await createUser({
      email: `cleanup-user-${id}@example.com`,
      password: "password123",
      displayName: "Cleanup User",
    });
    const { group, leader } = await createGroupWithLeader({
      groupName: `Cleanup Static ${id}`,
      leaderNickname: "Cleanup Leader",
      userId: user.id,
    });
    const [template] = await listRaidTemplates(group.id);
    const schedule = await createScheduleFromTemplate({
      groupId: group.id,
      templateId: template.id,
      title: `Cleanup Schedule ${id}`,
      startsAt: "2030-06-06T21:00:00+09:00",
      createdByMemberId: leader.id,
    });

    await expect(
      deleteAdminSchedule({
        adminEmail: "member@example.com",
        scheduleId: schedule.id,
      }),
    ).rejects.toThrow("관리자 권한이 필요합니다");

    await deleteAdminSchedule({ adminEmail, scheduleId: schedule.id });
    expect(await db.schedule.findUnique({ where: { id: schedule.id } })).toBeNull();

    await deleteAdminUser({ adminEmail, userId: user.id });
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await db.member.findUnique({ where: { id: leader.id } })).toBeNull();

    await deleteAdminGroup({ adminEmail, groupId: group.id });
    expect(await db.group.findUnique({ where: { id: group.id } })).toBeNull();
    expect(await db.member.findMany({ where: { groupId: group.id } })).toEqual([]);
  });

  it("deletes a login user's memberships, schedule checks, and created schedules", async () => {
    const id = randomUUID();
    const adminEmail = `cascade-admin-${id}@example.com`;
    process.env.ADMIN_EMAILS = adminEmail;
    const targetUser = await createUser({
      email: `cascade-target-${id}@example.com`,
      password: "password123",
      displayName: "Cascade Target",
    });
    const retainedLeaderUser = await createUser({
      email: `cascade-leader-${id}@example.com`,
      password: "password123",
      displayName: "Cascade Leader",
    });
    const retainedGroupIds: string[] = [];

    try {
      const { group: retainedGroup, leader: retainedLeader } =
        await createGroupWithLeader({
          groupName: `Cascade Retained ${id}`,
          leaderNickname: "Retained Leader",
          userId: retainedLeaderUser.id,
        });
      retainedGroupIds.push(retainedGroup.id);
      const targetMember = await joinGroupByInvite({
        inviteCode: retainedGroup.inviteCode,
        nickname: "Target Member",
        userId: targetUser.id,
      });
      await setAvailabilitySlot({
        memberId: targetMember.id,
        date: "2030-06-06",
        hour: 20,
        status: "AVAILABLE",
      });
      const targetCharacter = await createCharacter({
        memberId: targetMember.id,
        name: "TargetMain",
        className: "Bard",
        itemLevel: 1640,
        preferredRole: "SUPPORT",
        notes: "",
      });
      const [retainedTemplate] = await listRaidTemplates(retainedGroup.id);
      const retainedSchedule = await createScheduleFromTemplate({
        groupId: retainedGroup.id,
        templateId: retainedTemplate.id,
        title: `Retained Schedule ${id}`,
        startsAt: "2030-06-06T21:00:00+09:00",
        createdByMemberId: retainedLeader.id,
      });
      await setScheduleAttendance({
        scheduleId: retainedSchedule.id,
        memberId: targetMember.id,
        status: "ACCEPTED",
        memo: "attending",
      });
      const assignedSlot = await assignScheduleSlot({
        slotId: retainedSchedule.slots[0].id,
        memberId: targetMember.id,
        characterId: targetCharacter.id,
      });
      const notification = await createNotificationJob({
        groupId: retainedGroup.id,
        memberId: targetMember.id,
        scheduleId: retainedSchedule.id,
        type: "REMINDER",
        message: "Reminder",
        sendAfter: new Date("2030-06-06T20:30:00+09:00"),
      });

      const { group: createdGroup, leader: targetLeader } =
        await createGroupWithLeader({
          groupName: `Cascade Created ${id}`,
          leaderNickname: "Target Leader",
          userId: targetUser.id,
        });
      retainedGroupIds.push(createdGroup.id);
      const [createdTemplate] = await listRaidTemplates(createdGroup.id);
      const createdSchedule = await createScheduleFromTemplate({
        groupId: createdGroup.id,
        templateId: createdTemplate.id,
        title: `Created Schedule ${id}`,
        startsAt: "2030-06-07T21:00:00+09:00",
        createdByMemberId: targetLeader.id,
      });

      await deleteAdminUser({ adminEmail, userId: targetUser.id });

      expect(await db.user.findUnique({ where: { id: targetUser.id } })).toBeNull();
      expect(await db.member.findUnique({ where: { id: targetMember.id } })).toBeNull();
      expect(await db.member.findUnique({ where: { id: targetLeader.id } })).toBeNull();
      expect(
        await db.character.findUnique({ where: { id: targetCharacter.id } }),
      ).toBeNull();
      expect(
        await db.availabilityBlock.findMany({ where: { memberId: targetMember.id } }),
      ).toEqual([]);
      expect(
        await db.scheduleAttendance.findMany({
          where: { memberId: targetMember.id },
        }),
      ).toEqual([]);
      expect(
        await db.notificationJob.findUnique({ where: { id: notification.id } }),
      ).toBeNull();
      expect(
        await db.schedule.findUnique({ where: { id: retainedSchedule.id } }),
      ).not.toBeNull();
      expect(
        await db.schedule.findUnique({ where: { id: createdSchedule.id } }),
      ).toBeNull();
      expect(await db.scheduleSlot.findUnique({ where: { id: assignedSlot.id } }))
        .toMatchObject({
          assignedMemberId: null,
          assignedCharacterId: null,
          confirmationStatus: "PENDING",
        });
    } finally {
      await db.group.deleteMany({ where: { id: { in: retainedGroupIds } } });
      await db.user.deleteMany({
        where: {
          email: {
            in: [
              `cascade-admin-${id}@example.com`,
              `cascade-target-${id}@example.com`,
              `cascade-leader-${id}@example.com`,
            ],
          },
        },
      });
    }
  });
});
