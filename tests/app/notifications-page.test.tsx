import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotificationsPage from "@/app/notifications/page";

const mocks = vi.hoisted(() => ({
  findNotifications: vi.fn(),
  getDiscordAuthorizeUrl: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/db", () => ({
  db: {
    notificationJob: {
      findMany: mocks.findNotifications,
    },
  },
}));

vi.mock("@/server/discord-oauth", () => ({
  getDiscordAuthorizeUrl: mocks.getDiscordAuthorizeUrl,
}));

vi.mock("@/server/notifications", () => ({
  sendTestNotificationDm: vi.fn(),
}));

describe("NotificationsPage", () => {
  it("limits non-leader notification history to the current member", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      discordUserId: null,
      groupId: "group-1",
      id: "member-1",
      role: "MEMBER",
    });
    mocks.getDiscordAuthorizeUrl.mockReturnValue(null);
    mocks.findNotifications.mockResolvedValue([]);

    render(await NotificationsPage());

    expect(mocks.findNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId: "group-1", memberId: "member-1" },
      }),
    );
    expect(screen.getByText("아직 생성된 알림이 없습니다.")).toBeInTheDocument();
  });

  it("lets leaders see group notification history", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      discordUserId: "discord-1",
      groupId: "group-1",
      id: "leader-1",
      role: "LEADER",
    });
    mocks.findNotifications.mockResolvedValue([]);

    render(await NotificationsPage());

    expect(mocks.findNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId: "group-1" },
      }),
    );
  });

  it("summarizes notification delivery states for scanning", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      discordUserId: "discord-1",
      groupId: "group-1",
      id: "leader-1",
      role: "LEADER",
    });
    mocks.findNotifications.mockResolvedValue([
      {
        failureReason: null,
        id: "job-1",
        member: { nickname: "A" },
        schedule: { title: "Raid" },
        status: "PENDING",
        type: "SCHEDULE_CREATED",
      },
      {
        failureReason: null,
        id: "job-2",
        member: { nickname: "B" },
        schedule: { title: "Raid" },
        status: "SENT",
        type: "REMINDER",
      },
      {
        failureReason: "blocked",
        id: "job-3",
        member: { nickname: "C" },
        schedule: { title: "Raid" },
        status: "FAILED",
        type: "REMINDER",
      },
    ]);

    render(await NotificationsPage());

    expect(screen.getByText("발송 대기 1")).toBeInTheDocument();
    expect(screen.getByText("발송 성공 1")).toBeInTheDocument();
    expect(screen.getByText("실패 1")).toBeInTheDocument();
    expect(screen.getByText("blocked")).toBeInTheDocument();
  });
});
