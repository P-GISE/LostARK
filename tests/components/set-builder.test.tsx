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

  it("hides set creation controls for members without set permissions", () => {
    // Given / When
    render(<SetBuilderBoard canManageSets={false} raidSets={[]} />);

    // Then
    expect(screen.queryByText("세트 추가")).not.toBeInTheDocument();
    expect(screen.getByText("이번 주 편성")).toBeInTheDocument();
  });

  it("renders set delete controls for set managers", () => {
    // Given / When
    render(
      <SetBuilderBoard
        canManageSets
        raidSets={[
          {
            id: "set-1",
            label: "Akkan 1",
            slots: [],
            status: "DRAFT",
            template: { difficulty: "Hard", gates: "1", name: "Akkan" },
          },
        ]}
      />,
    );

    // Then
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("renders slot assignment controls for set managers", () => {
    // Given / When
    render(
      <SetBuilderBoard
        assignmentOptions={[
          {
            characterId: "character-1",
            className: "Bard",
            memberId: "member-1",
            nickname: "Helper",
            role: "SUPPORT",
            name: "BardOne",
          },
        ]}
        canManageSets
        raidSets={[
          {
            id: "set-1",
            label: "Akkan 1",
            slots: [
              {
                absent: false,
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
    expect(
      screen.getByRole("combobox", { name: "Support 1 배정 캐릭터" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Helper · BardOne · Bard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "배정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "비우기" })).toBeInTheDocument();
  });
});
