import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("keeps schedule editing controls collapsed behind a compact summary", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "current-group",
      id: "member-1",
    });
    mocks.listCharactersForMember.mockResolvedValue([]);
    mocks.listScheduleAttendances.mockResolvedValue([]);
    mocks.findSchedule.mockResolvedValue({
      groupId: "current-group",
      id: "schedule-1",
      notes: [
        "준비물",
        "- 1관: 물약 / 아드 or 각물 / 암수 / 성부",
        "",
        "공대장 스킬",
        "- 1관: 니나브",
        "",
        "카드",
        "- 딜러: 세구빛",
        "- 서폿: 남바절",
      ].join("\n"),
      slots: [
        {
          assignedCharacter: null,
          assignedCharacterId: null,
          assignedMember: null,
          assignedMemberId: null,
          confirmationStatus: "PENDING",
          id: "slot-1",
          label: "DPS 1",
          notes: "",
          role: "DPS",
          scheduleId: "schedule-1",
          templateSlotId: "template-slot-1",
        },
      ],
      startsAt: new Date("2030-06-05T21:00:00+09:00"),
      status: "OPEN",
      template: { name: "카제로스 2막: 부유하는 악몽의 진혼곡" },
      title: "카제로스 2막",
    });

    render(
      await ScheduleDetailPage({
        params: Promise.resolve({ scheduleId: "schedule-1" }),
      }),
    );

    expect(screen.getByText("일정 정보")).toBeInTheDocument();
    expect(screen.getByText("템플릿")).toBeInTheDocument();
    expect(screen.getByText("카제로스 2막: 부유하는 악몽의 진혼곡")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-notes-summary")).toHaveClass(
      "max-h-40",
      "overflow-y-auto",
    );
    expect(screen.getByText("일정 수정")).toBeInTheDocument();
    expect(screen.getByText("일정 수정").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText("0 / 1명 배정")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-slot-list")).toHaveClass("divide-y");
  });
});
