import { describe, expect, it } from "vitest";
import {
  buildLostArkWeekDays,
  getKoreanWeekdayLabel,
  getLostArkWeekStartDate,
} from "@/lib/lostark-week";

describe("lostark week", () => {
  it("builds the weekly calendar from Wednesday through Tuesday", () => {
    const days = buildLostArkWeekDays(new Date("2026-06-04T13:00:00.000Z"));

    expect(days).toEqual([
      { date: "2026-06-03", label: "수" },
      { date: "2026-06-04", label: "목" },
      { date: "2026-06-05", label: "금" },
      { date: "2026-06-06", label: "토" },
      { date: "2026-06-07", label: "일" },
      { date: "2026-06-08", label: "월" },
      { date: "2026-06-09", label: "화" },
    ]);
  });

  it("keeps early Wednesday before 06:00 in the previous Lost Ark week", () => {
    expect(
      getLostArkWeekStartDate(new Date("2026-06-02T20:59:00.000Z")),
    ).toBe("2026-05-27");
    expect(
      getLostArkWeekStartDate(new Date("2026-06-02T21:00:00.000Z")),
    ).toBe("2026-06-03");
  });

  it("formats Korean weekday labels for date-only strings", () => {
    expect(getKoreanWeekdayLabel("2026-06-03")).toBe("수");
    expect(getKoreanWeekdayLabel("2026-06-09")).toBe("화");
  });
});
