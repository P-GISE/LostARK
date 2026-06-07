import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MembersPage from "@/app/members/page";

const mocks = vi.hoisted(() => ({
  listCharacterRaidChecksForGroup: vi.fn(),
  listMembers: vi.fn(),
  listRaidTemplates: vi.fn(),
  requireCurrentMember: vi.fn(),
  setCharacterRaidCheck: vi.fn(),
  syncLostArkCharactersForMember: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  requireCurrentMember: mocks.requireCurrentMember,
}));

vi.mock("@/server/character-sync", () => ({
  syncLostArkCharactersForMember: mocks.syncLostArkCharactersForMember,
}));

vi.mock("@/server/character-raid-checks", () => ({
  listCharacterRaidChecksForGroup: mocks.listCharacterRaidChecksForGroup,
  setCharacterRaidCheck: mocks.setCharacterRaidCheck,
}));

vi.mock("@/server/members", () => ({
  listMembers: mocks.listMembers,
}));

vi.mock("@/server/raid-templates", () => ({
  listRaidTemplates: mocks.listRaidTemplates,
}));

describe("MembersPage", () => {
  it("renders synced character data with a manual character fallback form", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listMembers.mockResolvedValue([
      {
        id: "member-1",
        nickname: "검수장",
        characters: [
          {
            className: "바드",
            combatPower: 6127,
            id: "character-1",
            isMain: true,
            itemLevel: 1773.33,
            lastSyncedAt: new Date("2026-06-05T12:00:00+09:00"),
            name: "본캐",
            notes: "숨겨야 하는 메모",
            preferredRole: "SUPPORT",
            serverName: "루페온",
          },
        ],
      },
    ]);
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "노말",
        gates: "1-4",
        id: "template-3",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "하드",
        gates: "1-4",
        id: "template-1",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "익스트림 하드",
        gates: "1-4",
        id: "template-4",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "노말",
        gates: "1-3",
        id: "template-2",
        name: "상아탑",
        slots: [],
      },
    ]);
    mocks.listCharacterRaidChecksForGroup.mockResolvedValue([
      {
        characterId: "character-1",
        raidTemplateId: "template-1",
        weekStartDate: "2026-06-03",
      },
    ]);

    render(await MembersPage());

    expect(screen.getByRole("heading", { name: "공대원" })).toBeInTheDocument();
    expect(screen.getAllByText("본캐로 캐릭터 불러오기").length).toBeGreaterThan(0);
    expect(screen.getByText("5분마다 자동 업데이트")).toBeInTheDocument();
    expect(screen.getAllByText("본캐").length).toBeGreaterThan(0);
    expect(screen.getByText("루페온")).toBeInTheDocument();
    expect(screen.getByText("내 캐릭터 수동 추가")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("캐릭터명")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "캐릭터 추가" })).toBeInTheDocument();
    expect(screen.queryByText("숨겨야 하는 메모")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    expect(screen.getByText("이번 주 보스 체크")).toBeInTheDocument();
    expect(screen.getByText("1/2 완료")).toBeInTheDocument();
    expect(screen.queryByText("1/4 완료")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "카멘 · 노말 · 1-4관문 완료 처리" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "카멘 · 하드 · 1-4관문 완료 해제" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "카멘 · 익스트림 하드 · 1-4관문 완료 처리",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "상아탑 · 노말 · 1-3관문 완료 처리" }),
    ).toBeInTheDocument();
  });

  it("shows boss matrix, sync failure state, remaining-only checklist, and schedule links", async () => {
    mocks.requireCurrentMember.mockResolvedValue({
      groupId: "group-1",
      id: "member-1",
      role: "LEADER",
    });
    mocks.listMembers.mockResolvedValue([
      {
        characterSyncFailedAt: new Date("2026-06-05T12:05:00+09:00"),
        characterSyncFailureReason: "로스트아크 OpenAPI 응답을 가져오지 못했습니다",
        id: "member-1",
        nickname: "리더",
        characters: [
          {
            className: "바드",
            combatPower: 6127,
            id: "character-1",
            isMain: true,
            itemLevel: 1773.33,
            lastSyncedAt: new Date("2026-06-05T12:00:00+09:00"),
            name: "본캐",
            notes: "",
            preferredRole: "SUPPORT",
            serverName: "루페온",
          },
        ],
      },
    ]);
    mocks.listRaidTemplates.mockResolvedValue([
      {
        difficulty: "노말",
        gates: "1-4",
        id: "template-kamen-normal",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "하드",
        gates: "1-4",
        id: "template-kamen-hard",
        name: "카멘",
        slots: [],
      },
      {
        difficulty: "노말",
        gates: "1-2",
        id: "template-egir-normal",
        name: "에기르",
        slots: [],
      },
    ]);
    mocks.listCharacterRaidChecksForGroup.mockResolvedValue([
      {
        characterId: "character-1",
        raidTemplateId: "template-kamen-hard",
        weekStartDate: "2026-06-03",
      },
    ]);

    render(
      await MembersPage({
        searchParams: Promise.resolve({ checklist: "remaining" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "이번 주 보스 현황" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("보스 체크 매트릭스")).toHaveTextContent(
      "카멘",
    );
    expect(screen.getByLabelText("보스 체크 매트릭스")).toHaveTextContent(
      "본캐",
    );
    expect(screen.getByText("최근 자동동기화 실패")).toBeInTheDocument();
    expect(
      screen.getByText("로스트아크 OpenAPI 응답을 가져오지 못했습니다"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "전체 보기" })).toHaveAttribute(
      "href",
      "/members",
    );
    expect(
      screen.queryByRole("button", {
        name: "카멘 · 노말 · 1-4관문 완료 처리",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "에기르 · 노말 · 1-2관문 완료 처리",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "에기르 · 노말 · 1-2관문 일정 만들기",
      }),
    ).toHaveAttribute("href", "/schedules?templateId=template-egir-normal");
  });
});
