import { describe, expect, it } from "vitest";
import { saveAvailabilityBlock } from "@/server/availability";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";

describe("availability", () => {
  it("saves an availability block for a member", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "CalendarUser",
    });

    const block = await saveAvailabilityBlock({
      memberId: member.id,
      date: "2026-06-04",
      startsAt: "2026-06-04T20:00:00+09:00",
      endsAt: "2026-06-04T22:00:00+09:00",
      status: "AVAILABLE",
      memo: "After dinner",
    });

    expect(block.status).toBe("AVAILABLE");
  });

  it("rejects a block whose end is before start", async () => {
    const group = await createGroup({ name: "Static" });
    const member = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "BadTime",
    });

    await expect(
      saveAvailabilityBlock({
        memberId: member.id,
        date: "2026-06-04",
        startsAt: "2026-06-04T22:00:00+09:00",
        endsAt: "2026-06-04T20:00:00+09:00",
        status: "AVAILABLE",
        memo: "",
      }),
    ).rejects.toThrow("Availability end must be after start");
  });
});
