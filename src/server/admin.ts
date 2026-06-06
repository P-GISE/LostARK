import type { User } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth-context";
import { db } from "@/server/db";

function getConfiguredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(/[,\s;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return getConfiguredAdminEmails().has(email.trim().toLowerCase());
}

export function isAdminUser(user: Pick<User, "email"> | null | undefined) {
  return isAdminEmail(user?.email);
}

function requireAdminEmail(adminEmail: string) {
  if (!isAdminEmail(adminEmail)) {
    throw new Error("관리자 권한이 필요합니다");
  }
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=/admin");
  }

  if (!isAdminUser(user)) {
    notFound();
  }

  return user;
}

export async function deleteAdminSchedule(input: {
  adminEmail: string;
  scheduleId: string;
}) {
  requireAdminEmail(input.adminEmail);

  return db.schedule.delete({
    where: { id: input.scheduleId },
  });
}

export async function deleteAdminGroup(input: {
  adminEmail: string;
  groupId: string;
}) {
  requireAdminEmail(input.adminEmail);

  return db.group.delete({
    where: { id: input.groupId },
  });
}

export async function deleteAdminUser(input: {
  adminEmail: string;
  userId: string;
}) {
  requireAdminEmail(input.adminEmail);

  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (target && isAdminEmail(target.email)) {
    throw new Error("관리자 계정은 삭제할 수 없습니다");
  }

  return db.user.delete({
    where: { id: input.userId },
  });
}

export async function getAdminOverview(now = new Date()) {
  const [
    totalUsers,
    totalGroups,
    totalMembers,
    totalSchedules,
    upcomingSchedules,
    failedNotifications,
    groups,
    users,
    schedules,
  ] = await Promise.all([
    db.user.count(),
    db.group.count(),
    db.member.count(),
    db.schedule.count(),
    db.schedule.count({
      where: {
        startsAt: { gte: now },
        status: { not: "CANCELED" },
      },
    }),
    db.notificationJob.count({ where: { status: "FAILED" } }),
    db.group.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        members: {
          where: { role: "LEADER" },
          select: { nickname: true },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            members: true,
            schedules: true,
          },
        },
      },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        memberships: {
          select: {
            group: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.schedule.findMany({
      orderBy: { startsAt: "desc" },
      take: 20,
      include: {
        group: { select: { name: true } },
      },
    }),
  ]);

  return {
    metrics: {
      totalUsers,
      totalGroups,
      totalMembers,
      totalSchedules,
      upcomingSchedules,
      failedNotifications,
    },
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      inviteEnabled: group.inviteEnabled,
      memberCount: group._count.members,
      scheduleCount: group._count.schedules,
      leaderNames: group.members.map((member) => member.nickname),
      updatedAt: group.updatedAt,
    })),
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      membershipCount: user.memberships.length,
      groupNames: user.memberships.map((membership) => membership.group.name),
      createdAt: user.createdAt,
    })),
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      status: schedule.status,
      groupName: schedule.group.name,
      startsAt: schedule.startsAt,
    })),
  };
}
