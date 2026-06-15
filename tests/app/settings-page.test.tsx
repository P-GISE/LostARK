import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/settings/page";

const mocks = vi.hoisted(() => ({
  getGroupOperationalSettings: vi.fn(),
  listGroupActivityLogs: vi.fn(),
  listGroupPermissionMembers: vi.fn(),
  requireCanManageSettings: vi.fn(),
  requireCurrentMember: vi.fn(),
  rotateGroupInviteCode: vi.fn(),
  updateGroupOperationalSettings: vi.fn(),
  updateGroupSettings: vi.fn(),
  updateMemberPermissions: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers({ host: "example.test" })),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/groups", () => ({
  rotateGroupInviteCode: mocks.rotateGroupInviteCode,
  updateGroupSettings: mocks.updateGroupSettings,
}));

vi.mock("@/server/group-settings", () => ({
  getGroupOperationalSettings: mocks.getGroupOperationalSettings,
  updateGroupOperationalSettings: mocks.updateGroupOperationalSettings,
}));

vi.mock("@/server/group-permissions", () => ({
  GroupPermissionError: class GroupPermissionError extends Error {},
  listGroupPermissionMembers: mocks.listGroupPermissionMembers,
  requireCanManageSettings: mocks.requireCanManageSettings,
  updateMemberPermissions: mocks.updateMemberPermissions,
}));

vi.mock("@/server/activity-log", () => ({
  listGroupActivityLogs: mocks.listGroupActivityLogs,
}));

describe("SettingsPage", () => {
  it("renders operational settings, permission, and activity log sections", async () => {
    // Given
    mocks.requireCurrentMember.mockResolvedValue({
      group: {
        id: "group-1",
        inviteCode: "invite-code",
        inviteEnabled: true,
        name: "목요일 공대",
      },
      groupId: "group-1",
      id: "member-1",
      nickname: "리더",
      role: "LEADER",
    });
    mocks.requireCanManageSettings.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.getGroupOperationalSettings.mockResolvedValue({
      availabilityChangeNoticeEnabled: true,
      dailyDiscordSummaryEnabled: true,
      dailyDiscordSummaryTime: "09:30",
      discordChannelId: "123",
      raidReminderLeadMinutes: 60,
      timetableEndHour: 4,
      timetableStartHour: 8,
    });
    mocks.listGroupPermissionMembers.mockResolvedValue([
      {
        id: "member-1",
        nickname: "리더",
        permissions: null,
        role: "LEADER",
      },
      {
        id: "member-2",
        nickname: "서포터",
        permissions: { canManageSets: true },
        role: "MEMBER",
      },
    ]);
    mocks.listGroupActivityLogs.mockResolvedValue([
      {
        actionType: "GROUP_SETTINGS_UPDATED",
        actorMember: { nickname: "리더" },
        createdAt: new Date("2026-06-15T09:00:00+09:00"),
        id: "log-1",
        summary: "공대 운영 설정을 변경했습니다",
      },
    ]);

    // When
    render(await SettingsPage());

    // Then
    expect(screen.getByRole("heading", { name: "공대 설정" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "시간표 표시 범위" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "멤버 권한" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "활동 기록" })).toBeInTheDocument();
  });
});
