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

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_EMAILS;
    Reflect.deleteProperty(window, "__lostArkPartyAdSenseUnitsRequested");
    Reflect.deleteProperty(window, "adsbygoogle");
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.usePathname.mockReturnValue("/weekly");
  });

  it("shows Korean planner navigation after joining a group", async () => {
    mocks.getCurrentMember.mockResolvedValue({
      id: "member-1",
      nickname: "모코코",
      role: "LEADER",
      group: { name: "목요일 공대" },
    });

    render(await AppShell({ children: <main>본문</main> }));

    const primaryNav = within(
      screen.getByRole("navigation", { name: "주요 메뉴" }),
    );
    expect(primaryNav.getByRole("link", { name: "대시보드" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(primaryNav.getByRole("link", { name: "주간" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(primaryNav.getByRole("link", { name: "편성" })).toHaveAttribute(
      "href",
      "/sets",
    );
    expect(primaryNav.getByRole("link", { name: "가능 시간" })).toHaveAttribute(
      "href",
      "/calendar",
    );
    expect(primaryNav.queryByRole("link", { name: "템플릿" })).not.toBeInTheDocument();

    const secondaryNav = within(
      screen.getByRole("navigation", { name: "보조 메뉴" }),
    );
    expect(secondaryNav.getByRole("link", { name: "숙제" })).toHaveAttribute(
      "href",
      "/homework",
    );
    expect(secondaryNav.getByRole("link", { name: "신청" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(secondaryNav.getByRole("link", { name: "템플릿" })).toHaveAttribute(
      "href",
      "/templates",
    );
    expect(secondaryNav.getByRole("link", { name: "알림" })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(secondaryNav.getByRole("link", { name: "공대원" })).toHaveAttribute(
      "href",
      "/members",
    );
    expect(
      secondaryNav.queryByRole("link", { name: "편성 가이드" }),
    ).not.toBeInTheDocument();

    const accountMenu = within(screen.getByLabelText("더보기 메뉴"));
    expect(accountMenu.getByRole("link", { name: "편성 가이드" })).toHaveAttribute(
      "href",
      "/guides/party-matching",
    );
    expect(accountMenu.getByRole("link", { name: "일정 가이드" })).toHaveAttribute(
      "href",
      "/guides/raid-schedule",
    );
    expect(accountMenu.getByRole("link", { name: "공대 설정" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getAllByText("목요일 공대").length).toBeGreaterThan(0);
  });

  it("hides group settings from non-leader members", async () => {
    mocks.getCurrentMember.mockResolvedValue({
      id: "member-2",
      nickname: "모코코",
      role: "MEMBER",
      group: { name: "목요일 공대" },
    });

    render(await AppShell({ children: <main>본문</main> }));

    expect(
      within(screen.getByLabelText("더보기 메뉴")).queryByRole("link", {
        name: "공대 설정",
      }),
    ).not.toBeInTheDocument();
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

    expect(
      within(screen.getByLabelText("더보기 메뉴")).getByRole("link", {
        name: "관리자",
      }),
    ).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
