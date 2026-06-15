import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignupPage from "@/app/signup/page";

const mocks = vi.hoisted(() => ({
  applyToRaidSignup: vi.fn(),
  assignRaidSignup: vi.fn(),
  canManageSets: vi.fn(),
  cancelRaidSignup: vi.fn(),
  cancelRaidSignupEntry: vi.fn(),
  createRaidSignup: vi.fn(),
  finalizeRaidSignup: vi.fn(),
  getLostArkWeekStartDate: vi.fn(() => "2030-06-05"),
  listCharactersForMember: vi.fn(),
  listRaidSignups: vi.fn(),
  listRaidTemplates: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/signups", () => ({
  applyToRaidSignup: mocks.applyToRaidSignup,
  assignRaidSignup: mocks.assignRaidSignup,
  cancelRaidSignup: mocks.cancelRaidSignup,
  cancelRaidSignupEntry: mocks.cancelRaidSignupEntry,
  createRaidSignup: mocks.createRaidSignup,
  finalizeRaidSignup: mocks.finalizeRaidSignup,
  listRaidSignups: mocks.listRaidSignups,
}));

vi.mock("@/server/characters", () => ({
  listCharactersForMember: mocks.listCharactersForMember,
}));

vi.mock("@/server/group-permissions", () => ({
  canManageSets: mocks.canManageSets,
}));

vi.mock("@/server/raid-templates", () => ({
  listRaidTemplates: mocks.listRaidTemplates,
}));

vi.mock("@/lib/lostark-week", () => ({
  getLostArkWeekStartDate: mocks.getLostArkWeekStartDate,
}));

describe("SignupPage", () => {
  it("renders signup creation and open signup list", async () => {
    // Given
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "Hard",
        gates: "1",
        id: "template-1",
        name: "Akkan",
      },
    ]);
    mocks.canManageSets.mockResolvedValue(true);
    mocks.listCharactersForMember.mockResolvedValue([
      { className: "Bard", id: "character-1", name: "BardOne" },
    ]);
    mocks.listRaidSignups.mockResolvedValue([
      {
        entries: [],
        id: "signup-1",
        maxParties: 1,
        partySize: 1,
        status: "OPEN",
        template: { difficulty: "Hard", gates: "1", name: "Akkan" },
        title: "Akkan class",
      },
    ]);

    // When
    render(await SignupPage());

    // Then
    expect(screen.getByRole("heading", { name: "수강 신청" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "신청 열기" })).toBeInTheDocument();
    expect(screen.getByText("Akkan class")).toBeInTheDocument();
  });

  it("orders signup template options by raid priority", async () => {
    // Given
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "노말",
        gates: "1-2",
        id: "template-prelude",
        name: "카제로스 서막: 붉어진 백야의 나선",
      },
      {
        difficulty: "노말",
        gates: "1-2",
        id: "template-finale",
        name: "카제로스 종막: 최후의 날",
      },
    ]);
    mocks.canManageSets.mockResolvedValue(true);
    mocks.listCharactersForMember.mockResolvedValue([]);
    mocks.listRaidSignups.mockResolvedValue([]);

    // When
    render(await SignupPage());
    const options = screen
      .getByLabelText("레이드")
      .querySelectorAll("option");

    // Then
    expect([...options].map((option) => option.textContent)).toEqual([
      "카제로스 종막: 최후의 날 · 노말 · 1-2관문",
      "카제로스 서막: 붉어진 백야의 나선 · 노말 · 1-2관문",
    ]);
  });
});
