import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityGrid } from "@/components/availability-grid";

describe("AvailabilityGrid", () => {
  it("renders a full day from 00:00 through 23:00", () => {
    render(
      <AvailabilityGrid
        days={[{ date: "2026-06-04", label: "목" }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /00:00 불가/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /23:00 불가/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /24:00/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /25:00/ }),
    ).not.toBeInTheDocument();
  });

  it("selects a time cell with the current status", async () => {
    const onChange = vi.fn();
    render(
      <AvailabilityGrid
        days={[{ date: "2026-06-04", label: "목" }]}
        initialStatuses={{ "2026-06-04:20": "UNAVAILABLE" }}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByRole("button", { name: /20:00 불가/ }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "가능" }));
    await userEvent.click(screen.getByRole("button", { name: /20:00 불가/ }));

    expect(onChange).toHaveBeenCalledWith([
      {
        date: "2026-06-04",
        hour: 20,
        status: "AVAILABLE",
      },
    ]);
    expect(
      screen.getByRole("button", { name: /20:00 가능/ }),
    ).toBeInTheDocument();
  });

  it("clears a selected time cell back to default unavailable", async () => {
    const onChange = vi.fn();
    render(
      <AvailabilityGrid
        days={[{ date: "2026-06-04", label: "목" }]}
        initialStatuses={{ "2026-06-04:20": "AVAILABLE" }}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "불가" }));
    await userEvent.click(screen.getByRole("button", { name: /20:00 가능/ }));

    expect(onChange).toHaveBeenCalledWith([
      {
        date: "2026-06-04",
        hour: 20,
        status: null,
      },
    ]);
    expect(
      screen.getByRole("button", { name: /20:00 불가/ }),
    ).toBeInTheDocument();
  });

  it("applies a chosen time range only to selected days", async () => {
    const onChange = vi.fn();
    render(
      <AvailabilityGrid
        days={[
          { date: "2026-06-04", label: "목" },
          { date: "2026-06-05", label: "금" },
        ]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "조율" }));
    await userEvent.selectOptions(screen.getByLabelText("시작 시간"), "20");
    await userEvent.selectOptions(screen.getByLabelText("끝 시간"), "22");
    await userEvent.click(screen.getByRole("button", { name: "목 06-04" }));
    await userEvent.click(screen.getByRole("button", { name: "선택 범위 적용" }));

    expect(onChange).toHaveBeenCalledWith([
      { date: "2026-06-05", hour: 20, status: "TENTATIVE" },
      { date: "2026-06-05", hour: 21, status: "TENTATIVE" },
    ]);
    expect(
      screen.getByRole("button", { name: /목 20:00 불가/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /금 21:00 조율/ }),
    ).toBeInTheDocument();
  });

  it("disables past slots and skips them during range apply", async () => {
    const onChange = vi.fn();
    render(
      <AvailabilityGrid
        days={[{ date: "2026-06-04", label: "목" }]}
        disabledSlotKeys={["2026-06-04:20"]}
        initialStatuses={{ "2026-06-04:20": "AVAILABLE" }}
        onChange={onChange}
      />,
    );

    const disabledCell = screen.getByRole("button", {
      name: /목 20:00 지난 시간/,
    });
    expect(disabledCell).toBeDisabled();

    await userEvent.click(disabledCell);
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "조율" }));
    await userEvent.selectOptions(screen.getByLabelText("시작 시간"), "20");
    await userEvent.selectOptions(screen.getByLabelText("끝 시간"), "22");
    await userEvent.click(screen.getByRole("button", { name: "선택 범위 적용" }));

    expect(onChange).toHaveBeenCalledWith([
      { date: "2026-06-04", hour: 21, status: "TENTATIVE" },
    ]);
  });

  it("does not render fixed quick input buttons", () => {
    render(
      <AvailabilityGrid
        days={[{ date: "2026-06-04", label: "목" }]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "저녁 20-24" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "밤 21-24" }),
    ).not.toBeInTheDocument();
  });

  it("paints multiple cells while dragging across the grid", async () => {
    const onChange = vi.fn();
    render(
      <AvailabilityGrid
        days={[{ date: "2026-06-04", label: "목" }]}
        onChange={onChange}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: /목 20:00 불가/ }));
    fireEvent.pointerEnter(screen.getByRole("button", { name: /목 21:00 불가/ }));
    fireEvent.pointerEnter(screen.getByRole("button", { name: /목 22:00 불가/ }));
    fireEvent.pointerUp(screen.getByRole("button", { name: /목 22:00 가능/ }));

    expect(onChange).toHaveBeenCalledWith([
      { date: "2026-06-04", hour: 20, status: "AVAILABLE" },
    ]);
    expect(onChange).toHaveBeenCalledWith([
      { date: "2026-06-04", hour: 21, status: "AVAILABLE" },
    ]);
    expect(onChange).toHaveBeenCalledWith([
      { date: "2026-06-04", hour: 22, status: "AVAILABLE" },
    ]);
    expect(
      screen.getByRole("button", { name: /목 22:00 가능/ }),
    ).toBeInTheDocument();
  });
});
