const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const LOST_ARK_WEEK_RESET_HOUR = 6;
const RESET_OFFSET_MS = LOST_ARK_WEEK_RESET_HOUR * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEDNESDAY = 3;
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function getKoreanWeekdayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return weekdayLabels[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function getLostArkWeekStartDate(now = new Date()) {
  const resetAdjustedKst = new Date(
    now.getTime() + KST_OFFSET_MS - RESET_OFFSET_MS,
  );
  const daysSinceWednesday =
    (resetAdjustedKst.getUTCDay() - WEDNESDAY + 7) % 7;

  return new Date(resetAdjustedKst.getTime() - daysSinceWednesday * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function buildLostArkWeekDays(now = new Date()) {
  const weekStart = getLostArkWeekStartDate(now);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      date,
      label: getKoreanWeekdayLabel(date),
    };
  });
}
