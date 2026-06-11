import { describe, expect, it } from "vitest";
import {
  listAvailabilityForMember,
  saveAvailabilityBlock,
} from "@/server/availability";
import { deleteStaleAvailabilityBlocksForGroup } from "@/server/availability-reset";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";

describe("availability reset", () => {
  it("deletes only availability blocks before the current Lost Ark week for one group", async () => {
    const group = await createGroup({ name: "Weekly Reset Group" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "ResetMember",
    });
    const otherGroup = await createGroup({ name: "Other Weekly Reset Group" });
    const otherMember = await joinGroupByInvite({
      inviteCode: otherGroup.inviteCode,
      nickname: "OtherResetMember",
    });

    await saveAvailabilityBlock({
      memberId: member.id,
      date: "2030-06-11",
      startsAt: "2030-06-11T20:00:00+09:00",
      endsAt: "2030-06-11T21:00:00+09:00",
      status: "AVAILABLE",
      memo: "",
    });
    const currentWeekBlock = await saveAvailabilityBlock({
      memberId: member.id,
      date: "2030-06-12",
      startsAt: "2030-06-12T20:00:00+09:00",
      endsAt: "2030-06-12T21:00:00+09:00",
      status: "TENTATIVE",
      memo: "",
    });
    const otherGroupBlock = await saveAvailabilityBlock({
      memberId: otherMember.id,
      date: "2030-06-11",
      startsAt: "2030-06-11T20:00:00+09:00",
      endsAt: "2030-06-11T21:00:00+09:00",
      status: "AVAILABLE",
      memo: "",
    });

    const result = await deleteStaleAvailabilityBlocksForGroup({
      groupId: group.id,
      now: new Date("2030-06-12T07:00:00+09:00"),
    });

    const memberBlocks = await listAvailabilityForMember(
      member.id,
      new Date("2030-06-01T00:00:00+09:00"),
      new Date("2030-06-20T00:00:00+09:00"),
    );
    const otherMemberBlocks = await listAvailabilityForMember(
      otherMember.id,
      new Date("2030-06-01T00:00:00+09:00"),
      new Date("2030-06-20T00:00:00+09:00"),
    );

    expect(result.count).toBe(1);
    expect(memberBlocks.map((block) => block.id)).toEqual([
      currentWeekBlock.id,
    ]);
    expect(otherMemberBlocks.map((block) => block.id)).toEqual([
      otherGroupBlock.id,
    ]);
  });
});
