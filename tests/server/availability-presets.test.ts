import { describe, expect, it } from "vitest";
import { createGroupWithLeader } from "@/server/groups";
import {
  createAvailabilityPreset,
  listAvailabilityPresets,
  saveAvailabilityWeekOverride,
} from "@/server/availability-presets";

describe("availability presets", () => {
  it("stores weekly presets and week override metadata", async () => {
    // Given
    const { leader } = await createGroupWithLeader({
      groupName: "가능시간 공대",
      leaderNickname: "리더",
    });

    // When
    await createAvailabilityPreset({
      memberId: leader.id,
      mode: "WEEKLY",
      name: "평일 저녁",
      slots: [{ dayOfWeek: 5, endTime: "23:00", startTime: "20:00" }],
    });
    await saveAvailabilityWeekOverride({
      memberId: leader.id,
      slots: [{ dayOfWeek: 5, endTime: "23:00", startTime: "21:00" }],
      weekStartDate: "2030-06-05",
    });
    const presets = await listAvailabilityPresets(leader.id);

    // Then
    expect(presets[0]?.name).toBe("평일 저녁");
    expect(presets[0]?.slots[0]?.startTime).toBe("20:00");
  });
});
