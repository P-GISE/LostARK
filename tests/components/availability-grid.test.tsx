import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityGrid } from "@/components/availability-grid";

describe("AvailabilityGrid", () => {
  it("selects a time cell with the current status", async () => {
    const onChange = vi.fn();
    render(<AvailabilityGrid date="2026-06-04" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Available" }));
    await userEvent.click(screen.getByRole("button", { name: "20:00" }));

    expect(onChange).toHaveBeenCalledWith({
      date: "2026-06-04",
      hour: 20,
      status: "AVAILABLE",
    });
  });
});
