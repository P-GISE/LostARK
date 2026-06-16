import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const root = process.cwd();

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

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("public AdSense approval content", () => {
  it("shows original public publisher content on the unauthenticated home page", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue(null);

    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        name: "로스트아크 고정 공대 운영을 한곳에서 정리합니다",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("고정 공대 운영 체크리스트")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "일정 조율 가이드 보기" })).toHaveAttribute(
      "href",
      "/guides/raid-schedule",
    );
    expect(screen.getByRole("link", { name: "서비스 소개" })).toHaveAttribute(
      "href",
      "/about",
    );
  });

  it("provides crawlable public policy and guide pages", () => {
    const expectedPages = [
      ["src/app/about/page.tsx", "운영 원칙"],
      ["src/app/guides/raid-schedule/page.tsx", "레이드 일정 조율 가이드"],
      ["src/app/guides/party-matching/page.tsx", "공대 편성 사용 가이드"],
      ["src/app/privacy/page.tsx", "Google 광고 서비스"],
      ["src/app/contact/page.tsx", "운영 문의"],
    ] as const;

    for (const [path, expectedText] of expectedPages) {
      expect(existsSync(join(root, path)), path).toBe(true);
      expect(readProjectFile(path), path).toContain(expectedText);
    }
  });

  it("publishes AdSense verification and crawler discovery files", () => {
    expect(readProjectFile("public/ads.txt").trim()).toBe(
      "google.com, pub-5055865634735480, DIRECT, f08c47fec0942fa0",
    );
    expect(robots()).toEqual(
      expect.objectContaining({
        sitemap: "https://pigs0516.com/sitemap.xml",
      }),
    );
    expect(sitemap()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "https://pigs0516.com/guides/raid-schedule",
        }),
        expect.objectContaining({
          url: "https://pigs0516.com/guides/party-matching",
        }),
      ]),
    );
  });
});
