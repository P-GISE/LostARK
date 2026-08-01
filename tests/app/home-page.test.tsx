import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  getCurrentUser: vi.fn(),
  getDashboardSummary: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  getCurrentMember: mocks.getCurrentMember,
  getCurrentUser: mocks.getCurrentUser,
  requireCurrentMember: vi.fn(async () => {
    throw new Error("멤버 세션이 필요합니다");
  }),
}));

vi.mock("@/server/dashboard", () => ({
  getDashboardSummary: mocks.getDashboardSummary,
}));

describe("HomePage", () => {
  it("renders deployment-safe onboarding when no member session exists", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);

    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        name: "공대장과 공대원이 같은 주간판을 봅니다",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공대장 업무" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공대원 업무" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute(
      "href",
      "/auth/signup",
    );
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    expect(screen.getByRole("link", { name: "일정 조율 가이드 보기" })).toHaveAttribute(
      "href",
      "/guides/raid-schedule",
    );
    expect(screen.queryByRole("link", { name: "로컬 초대 링크 열기" })).not.toBeInTheDocument();
  });

  it("separates authenticated dashboard work by raid leader and member tasks", async () => {
    mocks.getCurrentMember.mockResolvedValue({
      group: { name: "목요일 공대" },
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.getDashboardSummary.mockResolvedValue({
      failedNotifications: 1,
      memberCount: 8,
      missingAvailabilityCount: 2,
      upcomingSchedules: [],
    });

    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: "오늘의 공대 작업판" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공대장 업무" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공대원 업무" })).toBeInTheDocument();
    expect(screen.getByText("가능 시간 미입력 확인")).toBeInTheDocument();
    expect(screen.getByText("레이드 신청 확인")).toBeInTheDocument();
    expect(screen.getByText("실패 알림 처리")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "주간판 열기" })).toHaveAttribute(
      "href",
      "/weekly",
    );
  });
});
