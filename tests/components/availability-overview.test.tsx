import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvailabilityOverview } from "@/components/availability-overview";

describe("AvailabilityOverview", () => {
  it("ranks recommended time candidates by available members first", () => {
    render(
      <AvailabilityOverview
        slots={[
          {
            date: "2026-06-04",
            hour: 20,
            availableMembers: ["리더", "알파"],
            tentativeMembers: [],
            unavailableMembers: [],
            missingMembers: [],
          },
          {
            date: "2026-06-05",
            hour: 21,
            availableMembers: ["리더"],
            tentativeMembers: ["알파"],
            unavailableMembers: [],
            missingMembers: [],
          },
          {
            date: "2026-06-06",
            hour: 22,
            availableMembers: [],
            tentativeMembers: ["리더", "알파"],
            unavailableMembers: [],
            missingMembers: [],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "추천 시간" }),
    ).toBeInTheDocument();

    const candidates = within(
      screen.getByRole("list", { name: "추천 시간 후보" }),
    ).getAllByRole("listitem");

    expect(candidates[0]).toHaveTextContent("목 06-04 20:00");
    expect(candidates[0]).toHaveTextContent("가능 2");
    expect(
      within(candidates[0]).getByRole("link", {
        name: "이 시간으로 일정 만들기",
      }),
    ).toHaveAttribute(
      "href",
      "/schedules?startsAt=2026-06-04T20%3A00%3A00%2B09%3A00&from=availability",
    );
    expect(candidates[1]).toHaveTextContent("금 06-05 21:00");
    expect(candidates[1]).toHaveTextContent("가능 1");
    expect(candidates[2]).toHaveTextContent("토 06-06 22:00");
    expect(candidates[2]).toHaveTextContent("조율 2");
  });

  it("shows group availability counts and member names for each slot", () => {
    render(
      <AvailabilityOverview
        slots={[
          {
            date: "2026-06-04",
            hour: 20,
            availableMembers: ["리더"],
            tentativeMembers: ["알파"],
            unavailableMembers: [],
            missingMembers: ["베타"],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "공대 가능 시간 현황" }),
    ).toBeInTheDocument();
    expect(screen.getByText("목")).toBeInTheDocument();
    expect(screen.getByText("06-04")).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getAllByText("가능 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("리더").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/조율 1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/알파/)).toBeInTheDocument();
    expect(screen.getAllByText(/미입력 1/).length).toBeGreaterThan(0);
    expect(screen.getByTitle(/미입력: 베타/)).toBeInTheDocument();
  });

  it("normalizes next-day hours in schedule creation links", () => {
    render(
      <AvailabilityOverview
        slots={[
          {
            date: "2026-06-04",
            hour: 25,
            availableMembers: ["리더", "알파"],
            tentativeMembers: [],
            unavailableMembers: [],
            missingMembers: [],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "이 시간으로 일정 만들기" }),
    ).toHaveAttribute(
      "href",
      "/schedules?startsAt=2026-06-05T01%3A00%3A00%2B09%3A00&from=availability",
    );
  });
});
