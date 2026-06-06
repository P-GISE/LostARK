import { describe, expect, it } from "vitest";
import { joinGroupByInvite } from "@/server/members";
import { listRaidTemplates } from "@/server/raid-templates";
import {
  createGroup,
  createGroupWithLeader,
  getGroupByInviteCode,
  rotateGroupInviteCode,
  updateGroupSettings,
} from "@/server/groups";

describe("groups", () => {
  it("creates a group with an invite code", async () => {
    const group = await createGroup({ name: "Thursday Static" });

    expect(group.name).toBe("Thursday Static");
    expect(group.inviteCode).toHaveLength(12);
    expect(group.inviteEnabled).toBe(true);

    const found = await getGroupByInviteCode(group.inviteCode);
    expect(found?.id).toBe(group.id);
  });

  it("creates a group with an initial leader", async () => {
    const result = await createGroupWithLeader({
      groupName: "목요일 하드 공대",
      leaderNickname: "공대장",
    });

    expect(result.group.name).toBe("목요일 하드 공대");
    expect(result.group.inviteCode).toHaveLength(12);
    expect(result.leader.nickname).toBe("공대장");
    expect(result.leader.role).toBe("LEADER");
    expect(result.leader.groupId).toBe(result.group.id);

    const templates = await listRaidTemplates(result.group.id);
    expect(templates.map((template) => template.name)).toEqual(
      expect.arrayContaining([
        "그림자 레이드: 고통의 마녀 세르카",
        "카제로스 종막: 최후의 날",
        "카제로스 4막: 파멸의 성채",
      ]),
    );
  });

  it("allows only leaders to update group settings", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "금요일 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "멤버",
    });

    const updated = await updateGroupSettings({
      actorMemberId: leader.id,
      groupId: group.id,
      name: "금요일 하드 공대",
      inviteEnabled: false,
    });

    expect(updated.name).toBe("금요일 하드 공대");
    expect(updated.inviteEnabled).toBe(false);
    await expect(
      updateGroupSettings({
        actorMemberId: member.id,
        groupId: group.id,
        name: "권한 없는 변경",
        inviteEnabled: true,
      }),
    ).rejects.toThrow("공대장만 설정을 변경할 수 있습니다");
  });

  it("rotates invite codes for leaders", async () => {
    const { group, leader } = await createGroupWithLeader({
      groupName: "토요일 공대",
      leaderNickname: "리더",
    });

    const rotated = await rotateGroupInviteCode({
      actorMemberId: leader.id,
      groupId: group.id,
    });

    expect(rotated.inviteCode).toHaveLength(12);
    expect(rotated.inviteCode).not.toBe(group.inviteCode);
  });
});
