import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TemplatesPage from "@/app/templates/page";

const mocks = vi.hoisted(() => ({
  requireCurrentMember: vi.fn(),
  listRaidTemplates: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/raid-templates", () => ({
  createRaidTemplateForLeader: vi.fn(),
  deleteRaidTemplate: vi.fn(),
  importDefaultRaidTemplatesForLeader: vi.fn(),
  listRaidTemplates: mocks.listRaidTemplates,
}));

describe("TemplatesPage", () => {
  it("shows normal, hard, and extreme templates with unambiguous labels", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "노말",
        gates: "1-3",
        id: "template-normal",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "하드",
        gates: "1-4",
        id: "template-hard",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "익스트림 나이트메어",
        gates: "최종 관문",
        id: "template-extreme",
        name: "카제로스 2막: 아브렐슈드",
        slots: [],
      },
    ]);

    render(await TemplatesPage());

    expect(
      screen.getByText(
        "지평의 성당, 세르카, 카제로스 서막부터 종막, 베히모스, 카멘, 상아탑, 카양겔 기본 구성을 중복 없이 추가합니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("카멘 · 노말 · 1-3관문")).toBeInTheDocument();
    expect(screen.getByLabelText("카멘 · 하드 · 1-4관문")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "카제로스 2막: 아브렐슈드 · 익스트림 나이트메어 · 최종 관문",
      ),
    ).toBeInTheDocument();
  });
});
