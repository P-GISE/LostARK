import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotEditor } from "@/components/slot-editor";

describe("SlotEditor", () => {
  it("renders assignment controls in a collapsed compact row", () => {
    render(
      <SlotEditor
        action={vi.fn()}
        characters={[
          {
            id: "character-1",
            name: "모코코바드",
            className: "바드",
            itemLevel: 1640,
          },
        ]}
        slot={{
          id: "slot-1",
          label: "서폿 1",
          assignedMemberNickname: null,
          assignedCharacterName: null,
        }}
      />,
    );

    const row = screen.getByTestId("slot-editor-row");
    expect(row.tagName).toBe("DETAILS");
    expect(row).not.toHaveAttribute("open");
    expect(screen.getByText("서폿 1")).toBeInTheDocument();
    expect(screen.getByText("빈 자리")).toBeInTheDocument();
    expect(screen.getByText("배정 변경")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "모코코바드 / 바드 / 1640" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 캐릭터 배정" })).toBeInTheDocument();
  });

  it("keeps assigned slot actions inside the same collapsed row", () => {
    render(
      <SlotEditor
        action={vi.fn()}
        characters={[
          {
            id: "character-1",
            name: "모코코바드",
            className: "바드",
            itemLevel: 1640,
          },
        ]}
        clearAction={vi.fn()}
        slot={{
          id: "slot-1",
          label: "서폿 1",
          assignedMemberNickname: "공대원",
          assignedCharacterName: "모코코바드",
        }}
      />,
    );

    const row = screen.getByTestId("slot-editor-row");
    expect(row).not.toHaveAttribute("open");
    expect(screen.getByText("배정됨")).toBeInTheDocument();
    expect(screen.getByText("공대원")).toBeInTheDocument();
    expect(screen.getByText("모코코바드")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "배정 해제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "배정 해제" }).closest("details")).toBe(row);
  });
});
