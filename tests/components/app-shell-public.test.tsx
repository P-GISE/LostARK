import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  getCurrentUser: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  getCurrentMember: mocks.getCurrentMember,
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

describe("AppShell public navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(window, "__lostArkPartyAdSenseUnitsRequested");
    Reflect.deleteProperty(window, "adsbygoogle");
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.usePathname.mockReturnValue("/");
  });

  it("hides protected navigation before joining a group", async () => {
    render(await AppShell({ children: <main>본문</main> }));

    expect(screen.queryByRole("link", { name: "가능 시간" })).not.toBeInTheDocument();
    const publicNav = within(
      screen.getByRole("navigation", { name: "공개 메뉴" }),
    );
    expect(publicNav.getByRole("link", { name: "소개" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(publicNav.getByRole("link", { name: "일정 가이드" })).toHaveAttribute(
      "href",
      "/guides/raid-schedule",
    );
    expect(publicNav.getByRole("link", { name: "편성 가이드" })).toHaveAttribute(
      "href",
      "/guides/party-matching",
    );
    expect(publicNav.getByRole("link", { name: "개인정보" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(publicNav.getByRole("link", { name: "문의" })).toHaveAttribute(
      "href",
      "/contact",
    );
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
});
