import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignupPage from "@/app/signup/page";

const mocks = vi.hoisted(() => ({
  createRaidSignup: vi.fn(),
  getLostArkWeekStartDate: vi.fn(() => "2030-06-05"),
  listRaidSignups: vi.fn(),
  listRaidTemplates: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/signups", () => ({
  createRaidSignup: mocks.createRaidSignup,
  listRaidSignups: mocks.listRaidSignups,
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
    mocks.listRaidSignups.mockResolvedValue([
      {
        entries: [],
        id: "signup-1",
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
});
