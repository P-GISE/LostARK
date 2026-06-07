import { describe, expect, it } from "vitest";
import {
  isDateTimeInPast,
  isKstAvailabilitySlotInPast,
} from "@/lib/time-slots";

describe("time slots", () => {
  const now = new Date("2026-06-07T07:30:00.000Z");

  it("treats availability slots that already started as past in KST", () => {
    expect(isKstAvailabilitySlotInPast("2026-06-07", 15, now)).toBe(true);
    expect(isKstAvailabilitySlotInPast("2026-06-07", 16, now)).toBe(true);
    expect(isKstAvailabilitySlotInPast("2026-06-07", 17, now)).toBe(false);
  });

  it("compares schedule start times against the current moment", () => {
    expect(isDateTimeInPast("2026-06-07T16:29:00+09:00", now)).toBe(true);
    expect(isDateTimeInPast("2026-06-07T16:30:00+09:00", now)).toBe(true);
    expect(isDateTimeInPast("2026-06-07T16:31:00+09:00", now)).toBe(false);
  });
});
