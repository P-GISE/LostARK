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
          startsAt: "2030-06-04T20:00:00+09:00",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "선택한 가능 시간으로 일정 생성" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2030\. 6\. 4\. 오후 8:00/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("2030-06-05T21:00:00+09:00")).toHaveValue(
      "2030-06-04T20:00:00+09:00",
    );
    expect(
      document.querySelector<HTMLInputElement>('input[name="templateId"]'),
    ).toHaveValue(
      "template-1",
    );
    expect(
      screen.getByRole("button", {
        name: "Thaemine · Hard · 1-4관문 선택됨",
      }),
    ).toBeInTheDocument();
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
        date: "2030-06-04",
        hour: 20,
        missingCount: 1,
        missingMembers: ["D"],
        startsAt: "2030-06-04T20:00:00+09:00",
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

  it("preselects a template from the checklist schedule link", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "leader-1",
      role: "LEADER",
    });
    mocks.listUpcomingSchedules.mockResolvedValue([]);
    mocks.getRecommendedScheduleSlots.mockResolvedValue([]);
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "노말",
        gates: "1-4",
        id: "template-kamen-normal",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "하드",
        gates: "1-2",
        id: "template-serka-hard",
        name: "세르카",
        slots: [],
      },
    ]);

    render(
      await SchedulesPage({
        searchParams: Promise.resolve({
          templateId: "template-serka-hard",
        }),
      }),
    );

    expect(
      document.querySelector<HTMLInputElement>('input[name="templateId"]'),
    ).toHaveValue(
      "template-serka-hard",
    );
    expect(screen.getAllByText("세르카 · 하드 · 1-2관문")).not.toHaveLength(0);
  });
});
