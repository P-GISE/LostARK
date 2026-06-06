import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  getCurrentMember: mocks.getCurrentMember,
  getCurrentUser: mocks.getCurrentUser,
}));

describe("AppShell", () => {
  it("shows Korean planner navigation after joining a group", async () => {
    mocks.getCurrentMember.mockResolvedValue({
      id: "member-1",
      nickname: "모코코",
      role: "LEADER",
      group: { name: "목요일 공대" },
    });

    render(await AppShell({ children: <main>본문</main> }));

    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "가능 시간" })).toHaveAttribute(
      "href",
      "/calendar",
    );
    expect(screen.getByRole("link", { name: "알림" })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(screen.getByRole("link", { name: "공대 설정" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByText("목요일 공대")).toBeInTheDocument();
  });

  it("hides group settings from non-leader members", async () => {
    mocks.getCurrentMember.mockResolvedValue({
      id: "member-2",
      nickname: "모코코",
      role: "MEMBER",
      group: { name: "목요일 공대" },
    });

    render(await AppShell({ children: <main>본문</main> }));

    expect(screen.queryByRole("link", { name: "공대 설정" })).not.toBeInTheDocument();
  });

  it("hides protected navigation before joining a group", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);

    render(await AppShell({ children: <main>본문</main> }));

    expect(screen.queryByRole("link", { name: "가능 시간" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute(
      "href",
      "/auth/signup",
    );
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    expect(screen.getByText("본문")).toBeInTheDocument();
  });
  it("shows the admin link for configured admin users", async () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    mocks.getCurrentMember.mockResolvedValue({
      id: "member-admin",
      nickname: "Owner",
      role: "LEADER",
      group: { name: "Admin Group" },
    });
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-admin",
      email: "owner@example.com",
      displayName: "Owner",
    });

    render(await AppShell({ children: <main>Admin body</main> }));

    expect(screen.getByRole("link", { name: "관리자" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
