import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScheduleCard } from "@/components/schedule-card";

describe("ScheduleCard", () => {
  it("renders open slot count in Korean", () => {
    render(
      <ScheduleCard
        title="상아탑"
        startsAt={new Date("2026-06-05T21:00:00+09:00")}
        openSlots={2}
      />,
    );

    expect(screen.getByText("2자리 비어 있음")).toBeInTheDocument();
  });
});
