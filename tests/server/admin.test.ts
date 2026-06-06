import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createUser } from "@/server/accounts";
import {
  deleteAdminGroup,
  deleteAdminSchedule,
  deleteAdminUser,
  getAdminOverview,
  isAdminEmail,
} from "@/server/admin";
import { db } from "@/server/db";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";
import { listRaidTemplates } from "@/server/raid-templates";
import { createScheduleFromTemplate } from "@/server/schedules";

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
      startsAt: "2026-06-06T21:00:00+09:00",
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
    const detachedMember = await db.member.findUnique({ where: { id: leader.id } });
    expect(detachedMember?.userId).toBeNull();

    await deleteAdminGroup({ adminEmail, groupId: group.id });
    expect(await db.group.findUnique({ where: { id: group.id } })).toBeNull();
    expect(await db.member.findMany({ where: { groupId: group.id } })).toEqual([]);
  });
});
