import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/invite/[inviteCode]/activate/route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getGroupByInviteCode: vi.fn(),
  getMemberForUserInGroup: vi.fn(),
  setCurrentMemberSession: vi.fn(),
}));

vi.mock("@/server/auth-context", () => ({
  getCurrentUser: mocks.getCurrentUser,
  getMemberForUserInGroup: mocks.getMemberForUserInGroup,
  setCurrentMemberSession: mocks.setCurrentMemberSession,
}));

vi.mock("@/server/groups", () => ({
  getGroupByInviteCode: mocks.getGroupByInviteCode,
}));

describe("Invite activation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not mutate session state on GET requests", async () => {
    const response = await GET(
      new Request("https://lostark.test/invite/invite-1/activate"),
      { params: Promise.resolve({ inviteCode: "invite-1" }) },
    );

    expect(mocks.setCurrentMemberSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "https://lostark.test/invite/invite-1",
    );
  });

  it("sets the existing group member session on POST and redirects to the dashboard", async () => {
    // Given
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getGroupByInviteCode.mockResolvedValue({
      id: "group-1",
      inviteEnabled: true,
    });
    mocks.getMemberForUserInGroup.mockResolvedValue({
      id: "member-1",
      groupId: "group-1",
    });

    // When
    const response = await POST(
      new Request("https://lostark.test/invite/invite-1/activate"),
      { params: Promise.resolve({ inviteCode: "invite-1" }) },
    );

    // Then
    expect(mocks.setCurrentMemberSession).toHaveBeenCalledWith("member-1");
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://lostark.test/");
  });

  it("redirects unauthenticated POST activation to login without setting a member session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(
      new Request("https://lostark.test/invite/invite-1/activate"),
      { params: Promise.resolve({ inviteCode: "invite-1" }) },
    );

    expect(mocks.setCurrentMemberSession).not.toHaveBeenCalled();
    expect(response.headers.get("Location")).toBe(
      "https://lostark.test/auth/login?next=%2Finvite%2Finvite-1",
    );
  });

  it("returns to the invite page when the logged-in user is not a group member", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getGroupByInviteCode.mockResolvedValue({
      id: "group-1",
      inviteEnabled: true,
    });
    mocks.getMemberForUserInGroup.mockResolvedValue(null);

    const response = await POST(
      new Request("https://lostark.test/invite/invite-1/activate"),
      { params: Promise.resolve({ inviteCode: "invite-1" }) },
    );

    expect(mocks.setCurrentMemberSession).not.toHaveBeenCalled();
    expect(response.headers.get("Location")).toBe(
      "https://lostark.test/invite/invite-1",
    );
  });
});
