"use client";

import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import { availabilityHours } from "@/lib/availability-hours";

type Status = "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";
type CellStatus = Status | null;

type Day = {
  date: string;
  label: string;
};

type AvailabilityChange = {
  date: string;
  hour: number;
  status: CellStatus;
};

const labels: Record<Status, string> = {
  AVAILABLE: "가능",
  UNAVAILABLE: "불가",
  TENTATIVE: "조율",
};

const statusClasses: Record<Status, string> = {
  AVAILABLE: "border-emerald-300 bg-emerald-50 text-emerald-800",
  UNAVAILABLE: "border-rose-300 bg-rose-50 text-rose-800",
  TENTATIVE: "border-amber-300 bg-amber-50 text-amber-800",
};

const modeOptions: Array<{
  label: string;
  status: CellStatus;
  className: string;
}> = [
  {
    label: "가능",
    status: "AVAILABLE",
    className: statusClasses.AVAILABLE,
  },
  {
    label: "조율",
    status: "TENTATIVE",
    className: statusClasses.TENTATIVE,
  },
  {
    label: "불가",
    status: null,
    className: statusClasses.UNAVAILABLE,
  },
];

const defaultDays: Day[] = [{ date: "2026-06-04", label: "오늘" }];

function slotKey(date: string, hour: number) {
  return `${date}:${hour}`;
}

function displayHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function cellLabel(status: CellStatus) {
  return status ? labels[status] : "불가";
}

function nextStatuses(
  current: Record<string, Status>,
  changes: AvailabilityChange[],
) {
  const next = { ...current };

  for (const change of changes) {
    const key = slotKey(change.date, change.hour);
    if (change.status) {
      next[key] = change.status;
    } else {
      delete next[key];
    }
  }

  return next;
}

function uniqueChanges(changes: AvailabilityChange[]) {
  const map = new Map<string, AvailabilityChange>();

  for (const change of changes) {
    map.set(slotKey(change.date, change.hour), change);
  }

  return Array.from(map.values());
}

export function AvailabilityGrid({
  days = defaultDays,
  disabledSlotKeys = [],
  initialStatuses = {},
  onChange,
}: {
  days?: Day[];
  disabledSlotKeys?: string[];
  initialStatuses?: Record<string, Status>;
  onChange: (changes: AvailabilityChange[]) => void;
}) {
  const disabledSlots = useMemo(
    () => new Set(disabledSlotKeys),
    [disabledSlotKeys],
  );
  const [selectedStatus, setSelectedStatus] =
    useState<CellStatus>("AVAILABLE");
  const [selectedDayDates, setSelectedDayDates] = useState(
    () =>
      new Set(
        days
          .filter((day) =>
            availabilityHours.some(
              (hour) => !disabledSlots.has(slotKey(day.date, hour)),
            ),
          )
          .map((day) => day.date),
      ),
  );
  const [rangeStartHour, setRangeStartHour] = useState(20);
  const [rangeEndHour, setRangeEndHour] = useState(24);
  const [statuses, setStatuses] =
    useState<Record<string, Status>>(initialStatuses);
  const [isPending, startTransition] = useTransition();
  const [isPainting, setIsPainting] = useState(false);
  const paintedKeysRef = useRef(new Set<string>());
  const pointerHandledClickRef = useRef(false);

  function commitChanges(changes: AvailabilityChange[]) {
    const normalizedChanges = uniqueChanges(changes);
    if (normalizedChanges.length === 0) return;

    setStatuses((current) => nextStatuses(current, normalizedChanges));
    startTransition(() => {
      onChange(normalizedChanges);
    });
  }

  function selectedChange(day: Day, hour: number): AvailabilityChange {
    return {
      date: day.date,
      hour,
      status: selectedStatus,
    };
  }

  function isSlotDisabled(date: string, hour: number) {
    return disabledSlots.has(slotKey(date, hour));
  }

  function isDayFullyDisabled(day: Day) {
    return availabilityHours.every((hour) => isSlotDisabled(day.date, hour));
  }

  function paintCell(day: Day, hour: number) {
    const key = slotKey(day.date, hour);
    if (isSlotDisabled(day.date, hour)) return;
    if (paintedKeysRef.current.has(key)) return;
    paintedKeysRef.current.add(key);
    commitChanges([selectedChange(day, hour)]);
  }

  function startPainting(day: Day, hour: number) {
    pointerHandledClickRef.current = true;
    paintedKeysRef.current = new Set();
    setIsPainting(true);
    paintCell(day, hour);
  }

  function stopPainting() {
    setIsPainting(false);
    paintedKeysRef.current = new Set();
  }

  function handleClick(day: Day, hour: number) {
    if (pointerHandledClickRef.current) {
      pointerHandledClickRef.current = false;
      return;
    }
    if (isSlotDisabled(day.date, hour)) return;
    commitChanges([selectedChange(day, hour)]);
  }

  function applyHours(hours: number[], targetDays = days) {
    commitChanges(
      targetDays.flatMap((day) =>
        hours
          .filter((hour) => !isSlotDisabled(day.date, hour))
          .map((hour) => selectedChange(day, hour)),
      ),
    );
  }

  function selectDaySet(mode: "all" | "weekday" | "weekend" | "none") {
    const nextDays = days.filter((day) => {
      if (isDayFullyDisabled(day)) return false;
      if (mode === "all") return true;
      if (mode === "none") return false;
      const isWeekend = day.label === "토" || day.label === "일";
      return mode === "weekend" ? isWeekend : !isWeekend;
    });

    setSelectedDayDates(new Set(nextDays.map((day) => day.date)));
  }

  function toggleDay(date: string) {
    const day = days.find((candidate) => candidate.date === date);
    if (day && isDayFullyDisabled(day)) return;

    setSelectedDayDates((current) => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  function applySelectedRange() {
    const targetDays = days.filter((day) => selectedDayDates.has(day.date));
    const hours = availabilityHours.filter(
      (hour) => hour >= rangeStartHour && hour < rangeEndHour,
    );

    applyHours(hours, targetDays);
  }

  const weekendDays = days.filter((day) =>
    day.label === "토" || day.label === "일",
  );
  const selectedDayCount = selectedDayDates.size;
  const selectedRangeHours = availabilityHours.filter(
    (hour) => hour >= rangeStartHour && hour < rangeEndHour,
  );
  const selectedRangeDays = days.filter((day) => selectedDayDates.has(day.date));
  const editableSlotCount = days.reduce(
    (total, day) =>
      total +
      availabilityHours.filter((hour) => !isSlotDisabled(day.date, hour))
        .length,
    0,
  );
  const availableCount = Object.entries(statuses).filter(
    ([key, value]) => value === "AVAILABLE" && !disabledSlots.has(key),
  ).length;
  const tentativeCount = Object.entries(statuses).filter(
    ([key, value]) => value === "TENTATIVE" && !disabledSlots.has(key),
  ).length;
  const unavailableCount = Math.max(
    0,
    editableSlotCount - availableCount - tentativeCount,
  );
  const summaryCounts: Record<Status, number> = {
    AVAILABLE: availableCount,
    TENTATIVE: tentativeCount,
    UNAVAILABLE: unavailableCount,
  };
  const canApplyRange =
    selectedDayCount > 0 &&
    rangeEndHour > rangeStartHour &&
    selectedRangeDays.some((day) =>
      selectedRangeHours.some((hour) => !isSlotDisabled(day.date, hour)),
    );

  return (
    <div
      className="space-y-4"
      onPointerLeave={stopPainting}
      onPointerUp={stopPainting}
    >
      <div className="grid gap-4 rounded-md border border-zinc-200 bg-white p-3">
        <div className="grid gap-2">
          <div className="text-xs font-semibold text-zinc-500">상태</div>
          <div className="flex flex-wrap gap-2">
          {modeOptions.map((option) => (
            <button
              aria-pressed={selectedStatus === option.status}
              className={`h-9 rounded-md border px-3 text-sm font-medium transition ${
                selectedStatus === option.status
                  ? option.className
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
              }`}
              key={option.label}
              onClick={() => setSelectedStatus(option.status)}
              type="button"
            >
              {option.label}
            </button>
          ))}
          {isPending ? (
            <span className="inline-flex h-9 items-center text-sm text-zinc-500">
              저장 중
            </span>
          ) : null}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">요일</span>
              <button
                className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                onClick={() => selectDaySet("all")}
                type="button"
              >
                전체
              </button>
              <button
                className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                onClick={() => selectDaySet("weekday")}
                type="button"
              >
                평일
              </button>
              {weekendDays.length > 0 ? (
                <button
                  className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                  onClick={() => selectDaySet("weekend")}
                  type="button"
                >
                  주말
                </button>
              ) : null}
              <button
                className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                onClick={() => selectDaySet("none")}
                type="button"
              >
                선택 해제
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => {
                const selected = selectedDayDates.has(day.date);
                const disabled = isDayFullyDisabled(day);
                return (
                  <button
                    aria-pressed={selected}
                    className={`h-9 rounded-md border px-3 text-sm font-medium transition ${
                      disabled
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                        : selected
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                    disabled={disabled}
                    key={day.date}
                    onClick={() => toggleDay(day.date)}
                    type="button"
                  >
                    {`${day.label} ${day.date.slice(5)}`}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[8.5rem_8.5rem_auto] sm:items-end">
            <label className="grid gap-1 text-sm font-medium text-zinc-700">
              시작 시간
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                onChange={(event) => setRangeStartHour(Number(event.target.value))}
                value={rangeStartHour}
              >
                {availabilityHours.map((hour) => (
                  <option key={hour} value={hour}>
                    {displayHour(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-700">
              끝 시간
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                onChange={(event) => setRangeEndHour(Number(event.target.value))}
                value={rangeEndHour}
              >
                {availabilityHours.map((hour) => (
                  <option key={hour + 1} value={hour + 1}>
                    {displayHour(hour + 1)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:bg-zinc-300"
              disabled={!canApplyRange}
              onClick={applySelectedRange}
              type="button"
            >
              선택 범위 적용
            </button>
          </div>
        </div>
      </div>
      <div
        className="grid gap-1 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-2 select-none sm:gap-2 sm:p-3"
        style={{
          gridTemplateColumns: `4.75rem repeat(${days.length}, minmax(5.75rem, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-20 bg-zinc-50 text-xs font-medium text-zinc-500">
          시간
        </div>
        {days.map((day) => (
          <div
            className="sticky top-0 z-10 rounded bg-zinc-50 px-1 text-xs font-medium text-zinc-600"
            key={day.date}
          >
            <div>{day.label}</div>
            <div className="mt-0.5 text-zinc-400">{day.date.slice(5)}</div>
          </div>
        ))}
        {availabilityHours.map((hour) => {
          const isHourDisabled = days.every((day) =>
            isSlotDisabled(day.date, hour),
          );

          return (
          <Fragment key={hour}>
            <button
              aria-label={`${displayHour(hour)} 전체 입력`}
              className={`sticky left-0 z-10 flex min-h-11 items-center rounded border border-transparent bg-zinc-50 px-1 text-left text-sm font-medium transition sm:min-h-12 ${
                isHourDisabled
                  ? "cursor-not-allowed text-zinc-300"
                  : "text-zinc-600 hover:border-zinc-300 hover:bg-white"
              }`}
              disabled={isHourDisabled}
              onClick={() => applyHours([hour])}
              type="button"
            >
              {displayHour(hour)}
            </button>
            {days.map((day) => {
              const key = slotKey(day.date, hour);
              const cellStatus = statuses[key];
              const displayStatus = cellStatus ?? "UNAVAILABLE";
              const disabled = isSlotDisabled(day.date, hour);

              return (
                <button
                  aria-label={`${day.label} ${displayHour(hour)} ${
                    disabled ? "지난 시간" : cellLabel(cellStatus ?? null)
                  }`}
                  className={`min-h-11 rounded-md border px-2 py-1.5 text-left text-sm transition hover:bg-zinc-50 sm:min-h-12 sm:px-3 ${
                    disabled
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-100"
                      : statusClasses[displayStatus]
                  }`}
                  disabled={disabled}
                  key={key}
                  onClick={() => handleClick(day, hour)}
                  onPointerDown={() => startPainting(day, hour)}
                  onPointerEnter={() => {
                    if (isPainting) {
                      paintCell(day, hour);
                    }
                  }}
                  type="button"
                >
                  <span className="block font-medium">{displayHour(hour)}</span>
                  <span className="mt-1 block text-xs">
                    {disabled ? "지난 시간" : cellLabel(cellStatus ?? null)}
                  </span>
                </button>
              );
            })}
          </Fragment>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {(["AVAILABLE", "TENTATIVE", "UNAVAILABLE"] as Status[]).map((status) => {
          return (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${statusClasses[status]}`}
              key={status}
            >
              <span className="font-medium">{labels[status]}</span>
              <span className="ml-2">{summaryCounts[status]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
