import Link from "next/link";
import {
  formatKstSlotDateTime,
  type GroupAvailabilitySlot,
} from "@/server/availability";
import { getKoreanWeekdayLabel } from "@/lib/lostark-week";

function displayHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function namesText(names: string[]) {
  return names.length > 0 ? names.join(", ") : "-";
}

function detailText(label: string, names: string[]) {
  return `${label}: ${namesText(names)}`;
}

function unavailableNames(slot: GroupAvailabilitySlot) {
  return Array.from(
    new Set([...slot.unavailableMembers, ...slot.missingMembers]),
  );
}

function slotDetailText(slot: GroupAvailabilitySlot) {
  return [
    detailText("가능", slot.availableMembers),
    detailText("조율", slot.tentativeMembers),
    detailText("불가", unavailableNames(slot)),
  ].join(" / ");
}

function secondaryCounts(slot: GroupAvailabilitySlot) {
  return [
    slot.tentativeMembers.length > 0
      ? `조율 ${slot.tentativeMembers.length}`
      : null,
    unavailableNames(slot).length > 0
      ? `불가 ${unavailableNames(slot).length}`
      : null,
  ].filter((count): count is string => Boolean(count));
}

function recommendedSlots(slots: GroupAvailabilitySlot[]) {
  return slots
    .filter(
      (slot) =>
        slot.availableMembers.length > 0 || slot.tentativeMembers.length > 0,
    )
    .toSorted((a, b) => {
      const availableDiff =
        b.availableMembers.length - a.availableMembers.length;
      if (availableDiff !== 0) {
        return availableDiff;
      }

      const tentativeDiff =
        b.tentativeMembers.length - a.tentativeMembers.length;
      if (tentativeDiff !== 0) {
        return tentativeDiff;
      }

      const unavailableDiff = unavailableNames(a).length - unavailableNames(b).length;
      if (unavailableDiff !== 0) {
        return unavailableDiff;
      }

      return a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date);
    })
    .slice(0, 5);
}

function coordinationNeededMembers(slots: GroupAvailabilitySlot[]) {
  const allMembers = new Set<string>();
  const coordinatedMembers = new Set<string>();

  for (const slot of slots) {
    for (const name of [
      ...slot.availableMembers,
      ...slot.tentativeMembers,
      ...slot.unavailableMembers,
      ...slot.missingMembers,
    ]) {
      allMembers.add(name);
    }
    for (const name of [...slot.availableMembers, ...slot.tentativeMembers]) {
      coordinatedMembers.add(name);
    }
  }

  return Array.from(allMembers)
    .filter((name) => !coordinatedMembers.has(name))
    .sort((a, b) => a.localeCompare(b, "ko"));
}

function candidateTimeText(slot: GroupAvailabilitySlot) {
  return `${getKoreanWeekdayLabel(slot.date)} ${slot.date.slice(5)} ${displayHour(
    slot.hour,
  )}`;
}

function scheduleLink(slot: GroupAvailabilitySlot) {
  const startsAt = formatKstSlotDateTime(slot.date, slot.hour);
  return `/schedules?startsAt=${encodeURIComponent(startsAt)}&from=availability`;
}

export function AvailabilityOverview({
  slots,
}: {
  slots: GroupAvailabilitySlot[];
}) {
  const dates = Array.from(new Set(slots.map((slot) => slot.date)));
  const hours = Array.from(new Set(slots.map((slot) => slot.hour))).sort(
    (a, b) => a - b,
  );
  const slotMap = new Map(
    slots.map((slot) => [`${slot.date}:${slot.hour}`, slot]),
  );
  const candidates = recommendedSlots(slots);
  const coordinationNeeded = coordinationNeededMembers(slots);

  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">추천 시간</h2>
          <p className="mt-1 text-sm text-zinc-500">
            가능 인원이 많은 시간부터 정렬했습니다.
          </p>
        </div>
        {candidates.length > 0 ? (
          <ol
            aria-label="추천 시간 후보"
            className="grid gap-3 md:grid-cols-3 xl:grid-cols-5"
          >
            {candidates.map((slot) => (
              <li
                className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
                key={`${slot.date}:${slot.hour}`}
              >
                <div className="text-sm font-semibold text-zinc-950">
                  {candidateTimeText(slot)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-600">
                  <span className="font-medium text-emerald-800">
                    {`가능 ${slot.availableMembers.length}`}
                  </span>
                  <span>{`조율 ${slot.tentativeMembers.length}`}</span>
                  <span>{`불가 ${unavailableNames(slot).length}`}</span>
                </div>
                {slot.availableMembers.length > 0 ? (
                  <div className="mt-2 truncate text-xs text-zinc-500">
                    {namesText(slot.availableMembers)}
                  </div>
                ) : null}
                <Link
                  className="mt-3 inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
                  href={scheduleLink(slot)}
                >
                  이 시간으로 일정 만들기
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
            아직 추천할 시간이 없습니다.
          </div>
        )}
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-amber-950">조율 필요</h2>
          <span className="text-xs font-semibold text-amber-800">
            {coordinationNeeded.length}명
          </span>
        </div>
        {coordinationNeeded.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {coordinationNeeded.map((name) => (
              <span
                className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-900"
                key={name}
              >
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-amber-800">
            모든 공대원이 한 번 이상 가능 또는 조율로 표시했습니다.
          </p>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-950">
          공대 가능 시간 현황
        </h2>
      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white shadow-sm">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="bg-zinc-100 text-left text-xs font-semibold text-zinc-600">
            <tr>
              <th className="sticky left-0 z-10 border-b border-zinc-200 bg-zinc-100 px-3 py-2">
                시간
              </th>
              {dates.map((date) => (
                <th
                  className="min-w-36 border-b border-zinc-200 px-3 py-2"
                  key={date}
                >
                  <span className="block text-zinc-800">
                    {getKoreanWeekdayLabel(date)}
                  </span>
                  <span className="mt-0.5 block text-zinc-500">
                    {date.slice(5)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr className="align-top odd:bg-white even:bg-zinc-50/60" key={hour}>
                <td className="sticky left-0 z-10 border-b border-zinc-100 bg-inherit px-3 py-2 font-medium text-zinc-700">
                  {displayHour(hour)}
                </td>
                {dates.map((date) => {
                  const slot = slotMap.get(`${date}:${hour}`);
                  if (!slot) {
                    return (
                      <td
                        className="border-b border-zinc-100 px-3 py-2 text-zinc-400"
                        key={date}
                      >
                        -
                      </td>
                    );
                  }

                  const counts = secondaryCounts(slot);

                  return (
                    <td
                      aria-label={slotDetailText(slot)}
                      className="border-b border-zinc-100 px-3 py-2"
                      key={date}
                      title={slotDetailText(slot)}
                    >
                      <div className="grid gap-1">
                        <div
                          className={
                            slot.availableMembers.length > 0
                              ? "font-medium text-emerald-800"
                              : "font-medium text-zinc-500"
                          }
                        >
                          {`가능 ${slot.availableMembers.length}`}
                        </div>
                        {counts.length > 0 ? (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-600">
                            {counts.map((count) => (
                              <span className="whitespace-nowrap" key={count}>
                                {count}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {slot.availableMembers.length > 0 ? (
                          <div className="truncate text-xs text-emerald-700">
                            {namesText(slot.availableMembers)}
                          </div>
                        ) : null}
                        {slot.tentativeMembers.length > 0 ? (
                          <div className="truncate text-xs text-amber-800">
                            {detailText("조율", slot.tentativeMembers)}
                          </div>
                        ) : null}
                        {unavailableNames(slot).length > 0 ? (
                          <div className="truncate text-xs text-rose-800">
                            {detailText("불가", unavailableNames(slot))}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  );
}
