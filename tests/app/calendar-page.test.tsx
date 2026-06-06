import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarPage from "@/app/calendar/page";

const mocks = vi.hoisted(() => ({
  getGroupAvailabilityOverview: vi.fn(),
  listAvailabilityForMember: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/components/availability-grid", () => ({
  AvailabilityGrid: () => <div data-testid="availability-grid" />,
}));

vi.mock("@/components/availability-overview", () => ({
  AvailabilityOverview: () => <div data-testid="availability-overview" />,
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/availability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/availability")>();
  return {
    ...actual,
    getGroupAvailabilityOverview: mocks.getGroupAvailabilityOverview,
    listAvailabilityForMember: mocks.listAvailabilityForMember,
  };
});

describe("CalendarPage", () => {
  it("puts my availability input before the group overview for leaders", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listAvailabilityForMember.mockResolvedValue([]);
    mocks.getGroupAvailabilityOverview.mockResolvedValue([]);

    render(await CalendarPage());

    const inputSection = screen
      .getByRole("heading", { name: "내 가능 시간 입력" })
      .closest("section");
    const overview = screen.getByTestId("availability-overview");

    expect(inputSection).not.toBeNull();
    expect(
      inputSection?.compareDocumentPosition(overview),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
