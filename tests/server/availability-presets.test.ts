import { describe, expect, it } from "vitest";
import { createGroupWithLeader } from "@/server/groups";
import { setAvailabilitySlot } from "@/server/availability";
import {
  applyAvailabilityPresetToWeek,
  createAvailabilityPreset,
  createAvailabilityPresetFromWeek,
  deleteAvailabilityPreset,
  listAvailabilityPresets,
  renameAvailabilityPreset,
  saveAvailabilityWeekOverride,
} from "@/server/availability-presets";
import { db } from "@/server/db";

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

  it("applies, renames, deletes, and creates presets from a week", async () => {
    const { leader } = await createGroupWithLeader({
      groupName: "프리셋 액션 공대",
      leaderNickname: "리더",
    });
    const preset = await createAvailabilityPreset({
      memberId: leader.id,
      mode: "WEEKLY",
      name: "저녁",
      slots: [{ dayOfWeek: 1, endTime: "22:00", startTime: "20:00" }],
    });

    await applyAvailabilityPresetToWeek({
      memberId: leader.id,
      presetId: preset.id,
      weekStartDate: "2030-06-05",
    });
    const renamed = await renameAvailabilityPreset({
      memberId: leader.id,
      name: "늦은 저녁",
      presetId: preset.id,
    });
    await deleteAvailabilityPreset({
      memberId: leader.id,
      presetId: preset.id,
    });
    await db.availabilityBlock.deleteMany({ where: { memberId: leader.id } });
    await setAvailabilitySlot({
      date: "2030-06-07",
      hour: 21,
      memberId: leader.id,
      status: "AVAILABLE",
    });
    const createdFromWeek = await createAvailabilityPresetFromWeek({
      memberId: leader.id,
      name: "이번 주 복사",
      weekStartDate: "2030-06-05",
    });
    const remaining = await listAvailabilityPresets(leader.id);

    expect(renamed?.name).toBe("늦은 저녁");
    expect(createdFromWeek.slots[0]?.dayOfWeek).toBe(2);
    expect(createdFromWeek.slots[0]?.startTime).toBe("21:00");
    expect(remaining.map((item) => item.name)).toEqual(["이번 주 복사"]);
  });
});
