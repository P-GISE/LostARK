import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WeeklyPage from "@/app/weekly/page";

const mocks = vi.hoisted(() => ({
  getLostArkWeekStartDate: vi.fn(() => "2030-06-05"),
  listRaidSetsForWeek: vi.fn(),
  listUpcomingSchedules: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/schedules", () => ({
  listUpcomingSchedules: mocks.listUpcomingSchedules,
}));

vi.mock("@/server/raid-sets", () => ({
  listRaidSetsForWeek: mocks.listRaidSetsForWeek,
}));

vi.mock("@/lib/lostark-week", () => ({
  getLostArkWeekStartDate: mocks.getLostArkWeekStartDate,
}));

describe("WeeklyPage", () => {
  it("renders weekly schedules and unscheduled draft sets", async () => {
    // Given
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listUpcomingSchedules.mockResolvedValue([
      {
        id: "schedule-1",
        startsAt: new Date("2030-06-05T12:00:00.000Z"),
        status: "CONFIRMED",
        title: "Akkan Friday",
      },
    ]);
    mocks.listRaidSetsForWeek.mockResolvedValue([
      {
        id: "set-1",
        label: "Akkan 1",
        pinned: true,
        slots: [],
        status: "DRAFT",
        template: { difficulty: "Hard", gates: "1", name: "Akkan" },
      },
    ]);

    // When
    render(await WeeklyPage());

    // Then
    expect(screen.getByRole("heading", { name: "주간 일정" })).toBeInTheDocument();
    expect(screen.getByText("미확정 세트")).toBeInTheDocument();
    expect(screen.getByText("이번 주 일정 복사")).toBeInTheDocument();
  });
});
