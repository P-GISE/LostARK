import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplateForm } from "@/components/template-form";

describe("TemplateForm", () => {
  it("renders deploy-ready template fields", () => {
    render(<TemplateForm action={vi.fn()} />);

    expect(screen.getByPlaceholderText("레이드 이름")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("난이도")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("관문")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("필요 인원")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("딜러 자리 수")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("서폿 자리 수")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "템플릿 생성" })).toBeInTheDocument();
  });
});
