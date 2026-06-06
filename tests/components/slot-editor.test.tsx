import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotEditor } from "@/components/slot-editor";

describe("SlotEditor", () => {
  it("renders assignment controls for the current member characters", () => {
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

    expect(screen.getByText("서폿 1")).toBeInTheDocument();
    expect(screen.getByText("비어 있음")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "모코코바드 / 바드 / 1640" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 캐릭터 배정" })).toBeInTheDocument();
  });
});
