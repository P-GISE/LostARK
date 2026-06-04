import { describe, expect, it } from "vitest";
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
});
