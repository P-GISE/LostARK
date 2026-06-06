import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SchedulesPage from "@/app/schedules/page";

const mocks = vi.hoisted(() => ({
  getRecommendedScheduleSlots: vi.fn(),
  listRaidTemplates: vi.fn(),
  listUpcomingSchedules: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/raid-templates", () => ({
  listRaidTemplates: mocks.listRaidTemplates,
}));

vi.mock("@/server/availability", () => ({
  getRecommendedScheduleSlots: mocks.getRecommendedScheduleSlots,
}));

vi.mock("@/server/schedules", () => ({
  createScheduleFromTemplate: vi.fn(),
  listUpcomingSchedules: mocks.listUpcomingSchedules,
}));

describe("SchedulesPage", () => {
  it("prefills schedule start time from a recommendation link", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listUpcomingSchedules.mockResolvedValue([]);
    mocks.getRecommendedScheduleSlots.mockResolvedValue([]);
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "Hard",
        gates: "1-4",
        id: "template-1",
        name: "Thaemine",
        slots: [],
      },
    ]);

    render(
      await SchedulesPage({
        searchParams: Promise.resolve({
          from: "availability",
          startsAt: "2026-06-04T20:00:00+09:00",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "선택한 가능 시간으로 일정 생성" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2026\. 6\. 4\. 오후 8:00/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("2026-06-05T21:00:00+09:00")).toHaveValue(
      "2026-06-04T20:00:00+09:00",
    );
    expect(
      screen.getByRole("option", { name: "Thaemine · Hard · 1-4관문" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("required");
    expect(screen.getByRole("option", { name: "템플릿 선택" })).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "선택 시간으로 일정 생성" }),
    ).toBeInTheDocument();
  });

  it("shows majority availability recommendations before manual time input", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "leader-1",
      role: "LEADER",
    });
    mocks.listUpcomingSchedules.mockResolvedValue([]);
    mocks.getRecommendedScheduleSlots.mockResolvedValue([
      {
        availableCount: 3,
        availableMembers: ["A", "B", "C"],
        date: "2026-06-04",
        hour: 20,
        missingCount: 1,
        missingMembers: ["D"],
        startsAt: "2026-06-04T20:00:00+09:00",
        tentativeCount: 0,
        tentativeMembers: [],
        totalMembers: 4,
        unavailableMembers: [],
      },
    ]);
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "Hard",
        gates: "1-4",
        id: "template-1",
        name: "Thaemine",
        slots: [],
      },
    ]);

    render(
      await SchedulesPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "추천 시간으로 일정 생성" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /3\/4 가능/ })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "추천 시간으로 일정 생성" }),
    ).toBeInTheDocument();
    expect(screen.getByText("직접 시간 입력")).toBeInTheDocument();
  });
});
