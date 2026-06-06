import { describe, expect, it } from "vitest";
import { setAvailabilitySlot } from "@/server/availability";
import { getDashboardSummary } from "@/server/dashboard";
import { createGroup } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";

describe("dashboard", () => {
  it("reports missing availability and upcoming schedule counts", async () => {
    const group = await createGroup({ name: "Static" });
    await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "One" });
    await joinGroupByInvite({ inviteCode: group.inviteCode, nickname: "Two" });

    const summary = await getDashboardSummary(
      group.id,
      new Date("2026-06-04T12:00:00+09:00"),
    );

    expect(summary.memberCount).toBe(2);
    expect(summary.missingAvailabilityCount).toBe(2);
    expect(summary.upcomingSchedules).toEqual([]);
  });

  it("counts availability entered anywhere in the Lost Ark week", async () => {
    const group = await createGroup({ name: "Weekly Dashboard" });
    const memberWithLaterAvailability = await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Later",
    });
    await joinGroupByInvite({
      inviteCode: group.inviteCode,
      nickname: "Missing",
    });
    await setAvailabilitySlot({
      memberId: memberWithLaterAvailability.id,
      date: "2026-06-06",
      hour: 20,
      status: "AVAILABLE",
    });

    const summary = await getDashboardSummary(
      group.id,
      new Date("2026-06-04T12:00:00+09:00"),
    );

    expect(summary.missingAvailabilityCount).toBe(1);
  });
});
