import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScheduleAttendancePanel } from "@/components/schedule-attendance-panel";

describe("ScheduleAttendancePanel", () => {
  it("renders attendance check buttons and the current member status", () => {
    render(
      <ScheduleAttendancePanel
        action={vi.fn()}
        attendances={[
          {
            memberId: "member-1",
            memberNickname: "리더",
            memo: "정시 가능",
            status: "ACCEPTED",
          },
          {
            memberId: "member-2",
            memberNickname: "멤버",
            memo: "",
            status: "DECLINED",
          },
        ]}
        currentMemberId="member-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "일정 참석 체크" })).toBeInTheDocument();
    expect(screen.getByText("내 상태: 참석")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "참석" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "조율" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "불참" })).toBeInTheDocument();
    expect(screen.getByText("리더")).toBeInTheDocument();
    expect(screen.getByText("정시 가능")).toBeInTheDocument();
    expect(screen.getByText("멤버")).toBeInTheDocument();
  });

  it("shows an empty state before anyone checks the schedule", () => {
    render(
      <ScheduleAttendancePanel
        action={vi.fn()}
        attendances={[]}
        currentMemberId="member-1"
      />,
    );

    expect(screen.getByText("내 상태: 미체크")).toBeInTheDocument();
    expect(screen.getByText("아직 참석 체크한 공대원이 없습니다.")).toBeInTheDocument();
  });
});
