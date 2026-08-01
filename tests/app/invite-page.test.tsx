import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InvitePage from "@/app/invite/[inviteCode]/page";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getMemberForUserInGroup: vi.fn(),
  getGroupByInviteCode: vi.fn(),
  joinGroupByInvite: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  requireCurrentUser: vi.fn(),
  setCurrentMemberSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/server/auth-context", () => ({
  getCurrentUser: mocks.getCurrentUser,
  getMemberForUserInGroup: mocks.getMemberForUserInGroup,
  requireCurrentUser: mocks.requireCurrentUser,
  setCurrentMemberSession: mocks.setCurrentMemberSession,
}));

vi.mock("@/server/groups", () => ({
  getGroupByInviteCode: mocks.getGroupByInviteCode,
}));

vi.mock("@/server/members", () => ({
  joinGroupByInvite: mocks.joinGroupByInvite,
}));

describe("InvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks existing members to confirm before switching the active group session", async () => {
    // Given
    mocks.getGroupByInviteCode.mockResolvedValue({
      id: "group-1",
      inviteEnabled: true,
      name: "기존 공대",
    });
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      displayName: "이미가입",
    });
    mocks.getMemberForUserInGroup.mockResolvedValue({
      id: "member-1",
      groupId: "group-1",
    });

    // When
    render(await InvitePage({ params: Promise.resolve({ inviteCode: "invite-1" }) }));

    // Then
    expect(mocks.setCurrentMemberSession).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.joinGroupByInvite).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "이 공대로 전환하기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("기존 공대에 이미 가입되어 있습니다."),
    ).toBeInTheDocument();
  });

  it("renders nickname entry when a logged-in user has not joined the invited group yet", async () => {
    // Given
    mocks.getGroupByInviteCode.mockResolvedValue({
      id: "group-1",
      inviteEnabled: true,
      name: "새 공대",
    });
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      displayName: "신규",
    });
    mocks.getMemberForUserInGroup.mockResolvedValue(null);

    // When
    render(await InvitePage({ params: Promise.resolve({ inviteCode: "invite-1" }) }));

    // Then
    expect(screen.getByRole("heading", { name: "공대 참가" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("닉네임")).toBeInTheDocument();
    expect(mocks.setCurrentMemberSession).not.toHaveBeenCalled();
  });
});
