import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomeworkPage from "@/app/homework/page";

const mocks = vi.hoisted(() => ({
  getLostArkWeekStartDate: vi.fn(() => "2030-06-05"),
  listHomeworkStatus: vi.fn(),
  requireCurrentMember: vi.fn(),
  setHomeworkCompleted: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/homework", () => ({
  listHomeworkStatus: mocks.listHomeworkStatus,
  setHomeworkCompleted: mocks.setHomeworkCompleted,
}));

vi.mock("@/lib/lostark-week", () => ({
  getLostArkWeekStartDate: mocks.getLostArkWeekStartDate,
}));

describe("HomeworkPage", () => {
  it("renders the group homework board", async () => {
    // Given
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listHomeworkStatus.mockResolvedValue({
      members: [
        {
          characters: [],
          completedCount: 0,
          id: "member-1",
          nickname: "Leader",
          totalCount: 0,
        },
      ],
      weekStartDate: "2030-06-05",
    });

    // When
    render(await HomeworkPage());

    // Then
    expect(screen.getByRole("heading", { name: "숙제 현황" })).toBeInTheDocument();
    expect(screen.getByText("Leader")).toBeInTheDocument();
  });
});
