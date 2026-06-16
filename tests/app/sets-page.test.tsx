import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SetsPage from "@/app/sets/page";

const mocks = vi.hoisted(() => ({
  availabilityHours: [19, 20],
  assignRaidSetSlot: vi.fn(),
  buildLostArkWeekDays: vi.fn(() => [
    { date: "2030-06-05", label: "수" },
    { date: "2030-06-06", label: "목" },
  ]),
  canConfirmSchedules: vi.fn(),
  canManageSets: vi.fn(),
  confirmRaidSetSchedule: vi.fn(),
  createRaidSetFromTemplate: vi.fn(),
  deleteRaidSet: vi.fn(),
  getLostArkWeekStartDate: vi.fn(() => "2030-06-05"),
  getRaidSetTimeRecommendations: vi.fn(),
  listRaidSetsForWeek: vi.fn(),
  listRaidTemplates: vi.fn(),
  listMembers: vi.fn(),
  markRaidSetSlotAbsent: vi.fn(),
  requireCurrentMember: vi.fn(),
  unassignRaidSetSlot: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/raid-templates", () => ({
  listRaidTemplates: mocks.listRaidTemplates,
}));

vi.mock("@/server/raid-sets", () => ({
  confirmRaidSetSchedule: mocks.confirmRaidSetSchedule,
  createRaidSetFromTemplate: mocks.createRaidSetFromTemplate,
  deleteRaidSet: mocks.deleteRaidSet,
  getRaidSetTimeRecommendations: mocks.getRaidSetTimeRecommendations,
  listRaidSetsForWeek: mocks.listRaidSetsForWeek,
}));

vi.mock("@/server/raid-set-slots", () => ({
  assignRaidSetSlot: mocks.assignRaidSetSlot,
  markRaidSetSlotAbsent: mocks.markRaidSetSlotAbsent,
  unassignRaidSetSlot: mocks.unassignRaidSetSlot,
}));

vi.mock("@/server/members", () => ({
  listMembers: mocks.listMembers,
}));

vi.mock("@/server/group-permissions", () => ({
  canConfirmSchedules: mocks.canConfirmSchedules,
  canManageSets: mocks.canManageSets,
}));

vi.mock("@/lib/lostark-week", () => ({
  buildLostArkWeekDays: mocks.buildLostArkWeekDays,
  getLostArkWeekStartDate: mocks.getLostArkWeekStartDate,
}));

vi.mock("@/lib/availability-hours", () => ({
  availabilityHours: mocks.availabilityHours,
}));

describe("SetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders set builder controls and draft sets", async () => {
    // Given
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.canManageSets.mockResolvedValue(true);
    mocks.canConfirmSchedules.mockResolvedValue(true);
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "하드",
        gates: "1",
        id: "template-1",
        name: "아칸",
      },
    ]);
    mocks.listRaidSetsForWeek.mockResolvedValue([
      {
        id: "set-1",
        label: "Akkan 1",
        slots: [
          {
            absent: false,
            id: "slot-1",
            label: "Support 1",
            role: "SUPPORT",
          },
        ],
        status: "DRAFT",
        template: { difficulty: "Hard", gates: "1", name: "Akkan" },
      },
    ]);
    mocks.listMembers.mockResolvedValue([
      {
        characters: [
          {
            className: "바드",
            id: "character-1",
            name: "지원캐릭",
            preferredRole: "SUPPORT",
          },
        ],
        id: "member-2",
        nickname: "지원",
      },
    ]);
    mocks.getRaidSetTimeRecommendations.mockResolvedValue([
      {
        availableMembers: ["지원"],
        conflictedMembers: [],
        date: "2030-06-05",
        hour: 20,
        missingMembers: [],
        recommended: true,
        score: 100,
        startsAt: "2030-06-05T11:00:00.000Z",
        summaryLabel: "전원 가능",
        tentativeMembers: [],
        totalMembers: 1,
        unavailableMembers: [],
      },
    ]);

    // When
    render(await SetsPage());

    // Then
    expect(screen.getByRole("heading", { name: "공대 편성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "세트 추가" })).toBeInTheDocument();
    expect(screen.getByText("Akkan 1")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Support 1 배정 캐릭터" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2030-06-05 20:00")).toBeInTheDocument();
    expect(screen.getByText("전원 가능")).toBeInTheDocument();
    expect(screen.getByText("가능 1/1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 시간 확정" }),
    ).toBeInTheDocument();
    expect(mocks.canConfirmSchedules).toHaveBeenCalledWith("member-1");
    expect(mocks.getRaidSetTimeRecommendations).toHaveBeenCalledWith({
      dates: ["2030-06-05", "2030-06-06"],
      hours: mocks.availabilityHours,
      limit: 3,
      now: expect.any(Date),
      raidSetId: "set-1",
    });
  });
});
