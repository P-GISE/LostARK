import { describe, expect, it } from "vitest";
import { createGroupWithLeader } from "@/server/groups";
import {
  canEditSchedules,
  canConfirmSchedules,
  canManageSets,
  requireCanEditSchedules,
  requireCanConfirmSchedules,
  requireCanManageSets,
  updateMemberPermissions,
} from "@/server/group-permissions";
import { joinGroupByInvite } from "@/server/members";

describe("group permissions", () => {
  it("allows leaders to manage sets by default", async () => {
    // Given
    const { leader } = await createGroupWithLeader({
      groupName: "권한 테스트 공대",
      leaderNickname: "리더",
    });

    // When / Then
    await expect(requireCanManageSets(leader.id)).resolves.toMatchObject({
      id: leader.id,
    });
    await expect(canManageSets(leader.id)).resolves.toBe(true);
    await expect(requireCanConfirmSchedules(leader.id)).resolves.toMatchObject({
      id: leader.id,
    });
    await expect(canConfirmSchedules(leader.id)).resolves.toBe(true);
  });

  it("allows delegated members to confirm schedules independently from set management", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "위임 테스트 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "부공대장",
    });

    // When
    await updateMemberPermissions({
      actorMemberId: leader.id,
      memberId: member.id,
      permissions: { canConfirmSchedules: true },
    });

    // Then
    await expect(canManageSets(member.id)).resolves.toBe(false);
    await expect(canConfirmSchedules(member.id)).resolves.toBe(true);
    await expect(requireCanConfirmSchedules(member.id)).resolves.toMatchObject({
      id: member.id,
    });
  });

  it("allows delegated members to edit schedules independently from confirmation", async () => {
    // Given
    const { group, leader } = await createGroupWithLeader({
      groupName: "일정 수정 위임 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "일정관리자",
    });

    // When
    await updateMemberPermissions({
      actorMemberId: leader.id,
      memberId: member.id,
      permissions: { canEditSchedules: true },
    });

    // Then
    await expect(canConfirmSchedules(member.id)).resolves.toBe(false);
    await expect(canEditSchedules(member.id)).resolves.toBe(true);
    await expect(requireCanEditSchedules(member.id)).resolves.toMatchObject({
      id: member.id,
    });
  });

  it("rejects normal members from managing sets", async () => {
    // Given
    const { group } = await createGroupWithLeader({
      groupName: "일반 멤버 테스트 공대",
      leaderNickname: "리더",
    });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "일반멤버",
    });

    // When / Then
    await expect(requireCanManageSets(member.id)).rejects.toThrow(
      "공대 편성 권한이 필요합니다",
    );
  });
});
