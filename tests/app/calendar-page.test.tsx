import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarPage from "@/app/calendar/page";

const mocks = vi.hoisted(() => ({
  deleteStaleAvailabilityBlocksForGroup: vi.fn(),
  getGroupAvailabilityOverview: vi.fn(),
  listAvailabilityForMember: vi.fn(),
  listUpcomingSchedules: vi.fn(),
  requireCurrentMember: vi.fn(),
}));

vi.mock("@/components/availability-grid", () => ({
  AvailabilityGrid: ({
    days,
  }: {
    readonly days: ReadonlyArray<{ readonly date: string }>;
  }) => (
    <div data-testid="availability-grid">
      {days.map((day) => day.date).join(",")}
    </div>
  ),
}));

vi.mock("@/components/availability-overview", () => ({
  AvailabilityOverview: () => <div data-testid="availability-overview" />,
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/schedules", () => ({
  listUpcomingSchedules: mocks.listUpcomingSchedules,
}));

vi.mock("@/server/availability-reset", () => ({
  deleteStaleAvailabilityBlocksForGroup:
    mocks.deleteStaleAvailabilityBlocksForGroup,
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
  beforeEach(() => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.deleteStaleAvailabilityBlocksForGroup.mockResolvedValue({ count: 0 });
    mocks.listAvailabilityForMember.mockResolvedValue([]);
    mocks.getGroupAvailabilityOverview.mockResolvedValue([]);
    mocks.listUpcomingSchedules.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts my availability input before the group overview for leaders", async () => {
    render(await CalendarPage());

    expect(mocks.deleteStaleAvailabilityBlocksForGroup).toHaveBeenCalledWith({
      groupId: "group-1",
      now: expect.any(Date),
    });

    const inputSection = screen
      .getByRole("heading", { name: "내 가능 시간 입력" })
      .closest("section");
    const overview = screen.getByTestId("availability-overview");

    expect(inputSection).not.toBeNull();
    expect(
      inputSection?.compareDocumentPosition(overview),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("shows upcoming schedules on the calendar page", async () => {
    mocks.listUpcomingSchedules.mockResolvedValue([
      {
        id: "schedule-1",
        slots: [{ assignedMemberId: null }, { assignedMemberId: "member-2" }],
        startsAt: new Date("2030-06-12T20:00:00+09:00"),
        template: { difficulty: "Hard", name: "Aegir" },
        title: "Aegir Hard",
      },
    ]);

    render(await CalendarPage());

    expect(mocks.listUpcomingSchedules).toHaveBeenCalledWith(
      "group-1",
      expect.any(Date),
    );
    expect(
      screen.getByRole("link", { name: /Aegir Hard/ }),
    ).toHaveAttribute("href", "/schedules/schedule-1");
  });

  it("shows the next editable week when the reset week has no editable slots left", async () => {
    vi.useFakeTimers({
      now: new Date("2026-06-09T16:30:00.000Z"),
    });

    render(await CalendarPage());

    expect(screen.getByTestId("availability-grid")).toHaveTextContent(
      "2026-06-10",
    );
    expect(screen.getByTestId("availability-grid")).not.toHaveTextContent(
      "2026-06-03",
    );
  });
});
