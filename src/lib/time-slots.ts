export function isDateTimeInPast(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date <= now;
}

export function kstSlotDateTime(date: string, hour: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 9));
}

export function isKstAvailabilitySlotInPast(
  date: string,
  hour: number,
  now = new Date(),
) {
  return kstSlotDateTime(date, hour) <= now;
}

export function futureKstAvailabilitySlots(
  dates: string[],
  hours: number[],
  now = new Date(),
) {
  return dates.flatMap((date) =>
    hours
      .filter((hour) => !isKstAvailabilitySlotInPast(date, hour, now))
      .map((hour) => ({ date, hour })),
  );
}
