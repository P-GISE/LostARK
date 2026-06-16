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

describe("AppShell ads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(window, "__lostArkPartyAdSenseUnitsRequested");
    Reflect.deleteProperty(window, "adsbygoogle");
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.usePathname.mockReturnValue("/");
  });

  it("renders the Google AdSense ad units after page content", async () => {
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
});
