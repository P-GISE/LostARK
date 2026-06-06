export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;

export const availabilityHours = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index,
);
