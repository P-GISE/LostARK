import { render, screen, waitFor, within } from "@testing-library/react";
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
    expect(secondaryNav.getByRole("link", { name: "편성 가이드" })).toHaveAttribute(
      "href",
      "/guides/party-matching",
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

    const accountMenu = within(screen.getByLabelText("계정 메뉴"));
    expect(accountMenu.getByRole("link", { name: "편성 가이드" })).toHaveAttribute(
      "href",
      "/guides/party-matching",
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
      within(screen.getByLabelText("계정 메뉴")).queryByRole("link", {
        name: "공대 설정",
      }),
    ).not.toBeInTheDocument();
  });

  it("hides protected navigation before joining a group", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);

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

  it("renders the Google AdSense ad units after page content", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);

    render(await AppShell({ children: <main>본문</main> }));

    const adRegion = screen.getByLabelText("광고");
    const displayAdUnit = within(adRegion).getByTestId("adsense-display-ad");
    const multiplexAdUnit = within(adRegion).getByTestId("adsense-multiplex-ad");

    expect(screen.getByText("본문")).toBeInTheDocument();
    expect(displayAdUnit).toHaveClass("adsbygoogle");
    expect(displayAdUnit).toHaveStyle({ display: "block" });
    expect(displayAdUnit).toHaveAttribute("data-ad-format", "auto");
    expect(displayAdUnit).toHaveAttribute("data-ad-client", "ca-pub-5055865634735480");
    expect(displayAdUnit).toHaveAttribute("data-ad-slot", "4012726766");
    expect(displayAdUnit).toHaveAttribute("data-full-width-responsive", "true");
    expect(multiplexAdUnit).toHaveClass("adsbygoogle");
    expect(multiplexAdUnit).toHaveStyle({ display: "block" });
    expect(multiplexAdUnit).toHaveAttribute("data-ad-format", "autorelaxed");
    expect(multiplexAdUnit).toHaveAttribute("data-ad-client", "ca-pub-5055865634735480");
    expect(multiplexAdUnit).toHaveAttribute("data-ad-slot", "6643298538");
  });

  it("queues each Google AdSense unit once in the browser", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);
    Reflect.set(window, "adsbygoogle", []);

    const rendered = render(await AppShell({ children: <main>첫 화면</main> }));

    await waitFor(() => {
      expect(Reflect.get(window, "adsbygoogle")).toEqual([{}, {}]);
    });

    rendered.rerender(await AppShell({ children: <main>두 번째 화면</main> }));

    await waitFor(() => {
      expect(Reflect.get(window, "adsbygoogle")).toEqual([{}, {}]);
    });
  });

  it("hides Google AdSense containers when Google returns unfilled slots", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);

    render(await AppShell({ children: <main>본문</main> }));

    const adRegion = screen.getByLabelText("광고");
    const displayAdUnitContainer = within(adRegion).getByTestId(
      "adsense-display-ad-container",
    );
    const displayAdUnit = within(displayAdUnitContainer).getByTestId(
      "adsense-display-ad",
    );

    expect(displayAdUnitContainer).not.toHaveAttribute("hidden");

    displayAdUnit.setAttribute("data-ad-status", "unfilled");

    await waitFor(() => {
      expect(displayAdUnitContainer).toHaveAttribute("hidden");
    });
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
      within(screen.getByLabelText("계정 메뉴")).getByRole("link", {
        name: "관리자",
      }),
    ).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
