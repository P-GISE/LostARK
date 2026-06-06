import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  authenticateUser,
  createUser,
  verifyPassword,
} from "@/server/accounts";
import { createGroupWithLeader } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";

function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID()}@example.com`;
}

describe("accounts", () => {
  it("creates a user with a hashed password", async () => {
    const email = uniqueEmail("leader");
    const user = await createUser({
      email: email.toUpperCase(),
      password: "password123!",
      displayName: "공대장",
    });

    expect(user.email).toBe(email);
    expect(user.passwordHash).not.toBe("password123!");
    await expect(verifyPassword("password123!", user.passwordHash)).resolves.toBe(
      true,
    );
  });

  it("authenticates an existing user", async () => {
    const email = uniqueEmail("login");
    await createUser({
      email,
      password: "password123!",
      displayName: "로그인",
    });

    const user = await authenticateUser({
      email: email.toUpperCase(),
      password: "password123!",
    });

    expect(user.email).toBe(email);
  });

  it("rejects duplicate email signups", async () => {
    const email = uniqueEmail("duplicate");
    await createUser({
      email,
      password: "password123!",
      displayName: "중복",
    });

    await expect(
      createUser({
        email: email.toUpperCase(),
        password: "password123!",
        displayName: "중복",
      }),
    ).rejects.toThrow("이미 가입된 이메일입니다");
  });

  it("links leader and invited member registrations to users", async () => {
    const leaderUser = await createUser({
      email: uniqueEmail("leader-linked"),
      password: "password123!",
      displayName: "리더",
    });
    const memberUser = await createUser({
      email: uniqueEmail("member-linked"),
      password: "password123!",
      displayName: "멤버",
    });

    const { group, leader } = await createGroupWithLeader({
      groupName: "로그인 공대",
      leaderNickname: "리더",
      userId: leaderUser.id,
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "멤버",
      userId: memberUser.id,
    });

    expect(leader.userId).toBe(leaderUser.id);
    expect(member.userId).toBe(memberUser.id);
  });
});
