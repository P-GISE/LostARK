import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvailabilityPresetsPanel } from "@/components/availability/availability-presets-panel";

describe("AvailabilityPresetsPanel", () => {
  it("renders preset controls and saved presets", () => {
    // Given / When
    render(
      <AvailabilityPresetsPanel
        presets={[
          {
            id: "preset-1",
            mode: "WEEKLY",
            name: "Weeknight",
            slots: [{ endTime: "23:00", id: "slot-1", startTime: "20:00" }],
          },
        ]}
      />,
    );

    // Then
    expect(screen.getByText("내 프리셋")).toBeInTheDocument();
    expect(screen.getByText("Weeknight")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프리셋 만들기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "예외로 저장" })).toBeInTheDocument();
  });
});
