import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScheduleDetailPage from "@/app/schedules/[scheduleId]/page";

const mocks = vi.hoisted(() => ({
  findSchedule: vi.fn(),
  listCharactersForMember: vi.fn(),
  listScheduleAttendances: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/characters", () => ({
  listCharactersForMember: mocks.listCharactersForMember,
}));

vi.mock("@/server/db", () => ({
  db: {
    schedule: {
      findUnique: mocks.findSchedule,
      findFirst: mocks.findSchedule,
    },
  },
}));

vi.mock("@/server/schedules", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/schedules")>();
  return {
    ...actual,
    listScheduleAttendances: mocks.listScheduleAttendances,
  };
});

describe("ScheduleDetailPage", () => {
  it("does not render a schedule outside the current member group", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "current-group",
      id: "member-1",
    });
    mocks.listCharactersForMember.mockResolvedValue([]);
    mocks.listScheduleAttendances.mockResolvedValue([]);
    mocks.findSchedule.mockImplementation(async (query) => {
      if (query.where?.groupId === "current-group") {
        return null;
      }
      return {
        groupId: "other-group",
        id: "schedule-1",
        notes: "",
        slots: [],
        startsAt: new Date("2026-06-05T21:00:00+09:00"),
        status: "OPEN",
        template: { name: "카멘" },
        title: "외부 일정",
      };
    });

    render(
      await ScheduleDetailPage({
        params: Promise.resolve({ scheduleId: "schedule-1" }),
      }),
    );

    expect(screen.getByText("일정을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("외부 일정")).not.toBeInTheDocument();
  });
});
