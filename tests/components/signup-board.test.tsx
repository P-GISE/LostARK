import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignupBoard } from "@/components/signup/signup-board";

describe("SignupBoard", () => {
  it("renders open signups and entry state", () => {
    // Given / When
    render(
      <SignupBoard
        signups={[
          {
            entries: [
              {
                character: { className: "Bard", name: "BardOne" },
                id: "entry-1",
                member: { id: "member-2", nickname: "Helper" },
                status: "APPLIED",
              },
            ],
            id: "signup-1",
            maxParties: 1,
            partySize: 1,
            status: "OPEN",
            template: { difficulty: "Hard", gates: "1", name: "Akkan" },
            title: "Akkan class",
          },
        ]}
      />,
    );

    // Then
    expect(screen.getByText("Akkan class")).toBeInTheDocument();
    expect(screen.getByText("BardOne")).toBeInTheDocument();
    expect(screen.getByText("신청 가능")).toBeInTheDocument();
  });

  it("renders member apply controls and hides organizer controls for members", () => {
    // Given / When
    render(
      <SignupBoard
        characters={[{ className: "Bard", id: "character-1", name: "BardOne" }]}
        currentMemberId="member-1"
        signups={[
          {
            entries: [],
            id: "signup-1",
            maxParties: 1,
            partySize: 1,
            status: "OPEN",
            template: { difficulty: "Hard", gates: "1", name: "Akkan" },
            title: "Akkan class",
          },
        ]}
      />,
    );

    // Then
    expect(screen.getByLabelText("내 캐릭터")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "신청" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "배정" })).not.toBeInTheDocument();
  });

  it("shows organizer assignment controls only when enough applicants exist", () => {
    // Given / When
    render(
      <SignupBoard
        canManageSignups
        signups={[
          {
            entries: [
              {
                character: { className: "Bard", name: "BardOne" },
                id: "entry-1",
                member: { id: "member-1", nickname: "Helper" },
                status: "APPLIED",
              },
            ],
            id: "signup-1",
            maxParties: 1,
            partySize: 2,
            status: "OPEN",
            template: { difficulty: "Hard", gates: "1", name: "Akkan" },
            title: "Akkan class",
          },
        ]}
      />,
    );

    // Then
    expect(screen.getByRole("button", { name: "배정" })).toBeDisabled();
  });
});
