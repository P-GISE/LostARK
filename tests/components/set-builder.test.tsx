import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetBuilderBoard } from "@/components/set-builder/set-builder-board";

describe("SetBuilderBoard", () => {
  it("renders draft sets with slot assignment state", () => {
    // Given / When
    render(
      <SetBuilderBoard
        raidSets={[
          {
            id: "set-1",
            label: "Akkan 1",
            slots: [
              {
                absent: false,
                assignedCharacter: { className: "Bard", name: "BardOne" },
                assignedMember: { nickname: "Helper" },
                id: "slot-1",
                label: "Support 1",
                role: "SUPPORT",
              },
            ],
            status: "DRAFT",
            template: { difficulty: "Hard", gates: "1", name: "Akkan" },
          },
        ]}
      />,
    );

    // Then
    expect(screen.getByText("Akkan 1")).toBeInTheDocument();
    expect(screen.getByText("BardOne")).toBeInTheDocument();
    expect(screen.getByText("Support 1")).toBeInTheDocument();
  });
});
