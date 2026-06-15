import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SetsPage from "@/app/sets/page";

const mocks = vi.hoisted(() => ({
  canManageSets: vi.fn(),
  assignRaidSetSlot: vi.fn(),
  createRaidSetFromTemplate: vi.fn(),
  deleteRaidSet: vi.fn(),
  getLostArkWeekStartDate: vi.fn(() => "2030-06-05"),
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
  createRaidSetFromTemplate: mocks.createRaidSetFromTemplate,
  deleteRaidSet: mocks.deleteRaidSet,
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
  canManageSets: mocks.canManageSets,
}));

vi.mock("@/lib/lostark-week", () => ({
  getLostArkWeekStartDate: mocks.getLostArkWeekStartDate,
}));

describe("SetsPage", () => {
  it("renders set builder controls and draft sets", async () => {
    // Given
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.canManageSets.mockResolvedValue(true);
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

    // When
    render(await SetsPage());

    // Then
    expect(screen.getByRole("heading", { name: "공대 편성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "세트 추가" })).toBeInTheDocument();
    expect(screen.getByText("Akkan 1")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Support 1 배정 캐릭터" }),
    ).toBeInTheDocument();
  });
});
