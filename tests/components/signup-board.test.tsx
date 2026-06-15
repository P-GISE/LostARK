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
                member: { nickname: "Helper" },
                status: "APPLIED",
              },
            ],
            id: "signup-1",
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
    expect(screen.getByText("APPLIED")).toBeInTheDocument();
  });
});
