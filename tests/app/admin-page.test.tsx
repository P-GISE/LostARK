import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "@/app/admin/page";

const mocks = vi.hoisted(() => ({
  deleteAdminGroup: vi.fn(),
  deleteAdminSchedule: vi.fn(),
  deleteAdminUser: vi.fn(),
  getAdminOverview: vi.fn(),
  isAdminEmail: vi.fn(),
  requireAdminUser: vi.fn(),
}));

vi.mock("@/server/admin", () => ({
  deleteAdminGroup: mocks.deleteAdminGroup,
  deleteAdminSchedule: mocks.deleteAdminSchedule,
  deleteAdminUser: mocks.deleteAdminUser,
  getAdminOverview: mocks.getAdminOverview,
  isAdminEmail: mocks.isAdminEmail,
  requireAdminUser: mocks.requireAdminUser,
}));

describe("AdminPage", () => {
  it("renders global metrics, users, and raid groups for an admin", async () => {
    mocks.requireAdminUser.mockResolvedValue({
      id: "admin-1",
      email: "owner@example.com",
      displayName: "Owner",
    });
    mocks.isAdminEmail.mockReturnValue(false);
    mocks.getAdminOverview.mockResolvedValue({
      metrics: {
        totalUsers: 3,
        totalGroups: 2,
        totalMembers: 7,
        totalSchedules: 4,
        upcomingSchedules: 1,
        failedNotifications: 0,
      },
      groups: [
        {
          id: "group-1",
          name: "Hard Akkan",
          inviteEnabled: true,
          memberCount: 4,
          scheduleCount: 3,
          leaderNames: ["Mokoko"],
          updatedAt: new Date("2026-06-05T08:00:00Z"),
        },
      ],
      users: [
        {
          id: "user-1",
          email: "raider@example.com",
          displayName: "Raider",
          membershipCount: 2,
          groupNames: ["Hard Akkan", "Thaemine"],
          createdAt: new Date("2026-06-05T07:00:00Z"),
        },
      ],
      schedules: [
        {
          id: "schedule-1",
          title: "Akkan G1-G3",
          status: "OPEN",
          groupName: "Hard Akkan",
          startsAt: new Date("2026-06-06T12:00:00Z"),
        },
      ],
    });

    render(await AdminPage());

    expect(screen.getByRole("heading", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByText("전체 유저")).toBeInTheDocument();
    expect(screen.getAllByText("Hard Akkan").length).toBeGreaterThan(0);
    expect(screen.getByText("raider@example.com")).toBeInTheDocument();

    const groupRow = screen.getAllByText("Hard Akkan")[0].closest("tr");
    expect(groupRow).not.toBeNull();
    expect(within(groupRow as HTMLTableRowElement).getByText("Mokoko")).toBeInTheDocument();
    expect(
      within(groupRow as HTMLTableRowElement).getByRole("button", {
        name: "공대 삭제",
      }),
    ).toBeInTheDocument();

    const userRow = screen.getByText("raider@example.com").closest("tr");
    expect(userRow).not.toBeNull();
    expect(within(userRow as HTMLTableRowElement).getByText("2")).toBeInTheDocument();
    expect(
      within(userRow as HTMLTableRowElement).getByRole("button", {
        name: "유저 삭제",
      }),
    ).toBeInTheDocument();

    const scheduleRow = screen.getByText("Akkan G1-G3").closest("tr");
    expect(scheduleRow).not.toBeNull();
    expect(
      within(scheduleRow as HTMLTableRowElement).getByRole("button", {
        name: "일정 삭제",
      }),
    ).toBeInTheDocument();
  });
});
