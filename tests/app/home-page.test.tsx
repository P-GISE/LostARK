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
        name: "공대 일정과 캐릭터를 한 화면에서 관리합니다",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute(
      "href",
      "/auth/signup",
    );
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    expect(screen.queryByRole("link", { name: "로컬 초대 링크 열기" })).not.toBeInTheDocument();
  });
});
