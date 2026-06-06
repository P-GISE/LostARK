import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CharacterSyncForm } from "@/components/character-sync-form";

describe("CharacterSyncForm", () => {
  it("renders a main character sync form", () => {
    render(<CharacterSyncForm action={vi.fn()} />);

    expect(screen.getByPlaceholderText("본캐 캐릭터명")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "본캐로 캐릭터 불러오기" }),
    ).toBeInTheDocument();
  });

  it("shows sync errors returned by the action", async () => {
    const user = userEvent.setup();

    render(
      <CharacterSyncForm
        action={async () => ({
          error: "로스트아크 OpenAPI 키가 설정되어 있지 않습니다",
        })}
      />,
    );

    await user.type(screen.getByPlaceholderText("본캐 캐릭터명"), "본캐");
    await user.click(screen.getByRole("button", { name: "본캐로 캐릭터 불러오기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "로스트아크 OpenAPI 키가 설정되어 있지 않습니다",
    );
  });
});
