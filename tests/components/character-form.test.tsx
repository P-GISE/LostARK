import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CharacterForm } from "@/components/character-form";

describe("CharacterForm", () => {
  it("renders Korean form labels", () => {
    render(<CharacterForm action={vi.fn()} />);

    expect(screen.getByPlaceholderText("캐릭터명")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("직업")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("서버")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("아이템 레벨")).toHaveAttribute(
      "step",
      "0.01",
    );
    expect(screen.getByPlaceholderText("전투력")).toHaveAttribute("step", "1");
    expect(screen.getByPlaceholderText("메모")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "캐릭터 추가" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "서폿" })).toBeInTheDocument();
  });
});
