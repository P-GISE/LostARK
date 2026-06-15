import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SetsPage from "@/app/sets/page";

const mocks = vi.hoisted(() => ({
  createRaidSetFromTemplate: vi.fn(),
  getLostArkWeekStartDate: vi.fn(() => "2030-06-05"),
  listRaidSetsForWeek: vi.fn(),
  listRaidTemplates: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/raid-templates", () => ({
  listRaidTemplates: mocks.listRaidTemplates,
}));

vi.mock("@/server/raid-sets", () => ({
  createRaidSetFromTemplate: mocks.createRaidSetFromTemplate,
  listRaidSetsForWeek: mocks.listRaidSetsForWeek,
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
        slots: [],
        status: "DRAFT",
        template: { difficulty: "Hard", gates: "1", name: "Akkan" },
      },
    ]);

    // When
    render(await SetsPage());

    // Then
    expect(screen.getByRole("heading", { name: "공대 편성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "세트 추가" })).toBeInTheDocument();
    expect(screen.getByText("Akkan 1")).toBeInTheDocument();
  });
});
