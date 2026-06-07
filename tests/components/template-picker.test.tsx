import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TemplatePicker } from "@/components/template-picker";

const templates = [
  {
    difficulty: "노말",
    gates: "1-3",
    id: "horizon-normal",
    name: "지평의 성당",
  },
  {
    difficulty: "하드",
    gates: "1-3",
    id: "horizon-hard",
    name: "지평의 성당",
  },
  {
    difficulty: "노말",
    gates: "1-2",
    id: "serka-normal",
    name: "세르카",
  },
];

describe("TemplatePicker", () => {
  it("groups templates, filters by search text, and posts the selected template id", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TemplatePicker defaultTemplateId="horizon-hard" templates={templates} />,
    );
    const selectedInput = () =>
      container.querySelector<HTMLInputElement>('input[name="templateId"]');

    expect(selectedInput()).toHaveValue("horizon-hard");
    expect(screen.getByLabelText("지평의 성당 템플릿 2개")).toHaveAttribute(
      "open",
    );
    expect(
      screen.getByRole("button", {
        name: "지평의 성당 · 하드 · 1-3관문 선택됨",
      }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("템플릿 검색"), "세르카");

    expect(screen.queryByText("지평의 성당")).not.toBeInTheDocument();
    expect(screen.getByLabelText("세르카 템플릿 1개")).toHaveAttribute("open");
    await user.click(
      screen.getByRole("button", {
        name: "세르카 · 노말 · 1-2관문 선택",
      }),
    );

    expect(selectedInput()).toHaveValue("serka-normal");
  });
});
