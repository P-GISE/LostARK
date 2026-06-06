import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState, PageHeader, SectionPanel } from "@/components/ui";

describe("shared UI components", () => {
  it("renders a page header with title, description, and action", () => {
    render(
      <PageHeader
        action={<a href="/settings">설정</a>}
        description="공대 운영 현황을 확인합니다."
        title="대시보드"
      />,
    );

    expect(screen.getByRole("heading", { name: "대시보드" })).toBeInTheDocument();
    expect(screen.getByText("공대 운영 현황을 확인합니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("renders a section panel and empty state", () => {
    render(
      <SectionPanel title="다가오는 일정">
        <EmptyState title="등록된 일정이 없습니다." />
      </SectionPanel>,
    );

    expect(screen.getByRole("heading", { name: "다가오는 일정" })).toBeInTheDocument();
    expect(screen.getByText("등록된 일정이 없습니다.")).toBeInTheDocument();
  });
});
