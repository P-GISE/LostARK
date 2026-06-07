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

function totalMemberCount(slot: GroupAvailabilitySlot) {
  return (
    slot.availableMembers.length +
    slot.tentativeMembers.length +
    unavailableNames(slot).length
  );
}

function availabilityPercent(slot: GroupAvailabilitySlot) {
  const total = totalMemberCount(slot);
  if (total === 0) {
    return 0;
  }
  return Math.round((slot.availableMembers.length / total) * 100);
}

function availabilityCellClassName(slot: GroupAvailabilitySlot) {
  const percent = availabilityPercent(slot);
  if (percent >= 75) {
    return "border-emerald-200 bg-emerald-50";
  }
  if (percent >= 50) {
    return "border-cyan-200 bg-cyan-50";
  }
  if (slot.availableMembers.length > 0 || slot.tentativeMembers.length > 0) {
    return "border-amber-200 bg-amber-50";
  }
  return "border-slate-200 bg-slate-50";
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

function bestAvailabilitySlot(slots: GroupAvailabilitySlot[]) {
  return [...slots].toSorted((a, b) => {
    const availableDiff =
      b.availableMembers.length - a.availableMembers.length;
    if (availableDiff !== 0) {
      return availableDiff;
    }

    const percentDiff = availabilityPercent(b) - availabilityPercent(a);
    if (percentDiff !== 0) {
      return percentDiff;
    }

    const tentativeDiff =
      b.tentativeMembers.length - a.tentativeMembers.length;
    if (tentativeDiff !== 0) {
      return tentativeDiff;
    }

    return a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date);
  })[0];
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

function SummaryMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 truncate text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function SlotRoster({ slot }: { slot: GroupAvailabilitySlot }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-950">
          {candidateTimeText(slot)}
        </div>
        <div className="text-xs font-semibold text-slate-500">
          가능 {slot.availableMembers.length}/{totalMemberCount(slot)}
        </div>
      </div>
      <div className="mt-2 grid gap-1.5 text-xs leading-5">
        <div className="truncate text-emerald-800">
          {detailText("가능", slot.availableMembers)}
        </div>
        <div className="truncate text-amber-800">
          {detailText("조율", slot.tentativeMembers)}
        </div>
        <div className="truncate text-rose-800">
          {detailText("불가", unavailableNames(slot))}
        </div>
      </div>
    </div>
  );
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
  const bestSlot = bestAvailabilitySlot(slots);
  const detailSlots =
    candidates.length > 0
      ? candidates
      : slots
          .filter(
            (slot) =>
              slot.availableMembers.length > 0 ||
              slot.tentativeMembers.length > 0,
          )
          .slice(0, 5);

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
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            공대 가능 시간 현황
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            숫자와 색상으로 먼저 비교하고, 명단은 상세 영역에서 확인합니다.
          </p>
        </div>
        <div
          aria-label="공대 가능 시간 요약"
          className="grid gap-3 md:grid-cols-3"
        >
          <SummaryMetric
            detail={bestSlot ? candidateTimeText(bestSlot) : "-"}
            label="최대 가능"
            value={
              bestSlot
                ? `${bestSlot.availableMembers.length}/${totalMemberCount(bestSlot)}명`
                : "0명"
            }
          />
          <SummaryMetric
            detail="가능 또는 조율 표시가 없는 공대원"
            label="조율 필요"
            value={`${coordinationNeeded.length}명`}
          />
          <SummaryMetric
            detail="가장 좋은 시간의 가능 비율"
            label="응답 현황"
            value={bestSlot ? `${availabilityPercent(bestSlot)}%` : "0%"}
          />
        </div>
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white shadow-sm">
          <table
            aria-label="공대 가능 시간 밀도표"
            className="w-max min-w-full border-collapse text-sm"
          >
            <thead className="bg-zinc-100 text-left text-xs font-semibold text-zinc-600">
              <tr>
                <th className="sticky left-0 z-10 border-b border-zinc-200 bg-zinc-100 px-3 py-2">
                  시간
                </th>
                {dates.map((date) => (
                  <th
                    className="min-w-32 border-b border-zinc-200 px-3 py-2"
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

                    return (
                      <td
                        aria-label={slotDetailText(slot)}
                        className={`border-b px-3 py-2 ${availabilityCellClassName(slot)}`}
                        key={date}
                        title={slotDetailText(slot)}
                      >
                        <div className="grid gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-semibold text-slate-950">
                              {availabilityPercent(slot)}%
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {slot.availableMembers.length}/{totalMemberCount(slot)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-medium">
                            <span className="whitespace-nowrap text-emerald-800">
                              가능 {slot.availableMembers.length}
                            </span>
                            <span className="whitespace-nowrap text-amber-800">
                              조율 {slot.tentativeMembers.length}
                            </span>
                            <span className="whitespace-nowrap text-rose-800">
                              불가 {unavailableNames(slot).length}
                            </span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detailSlots.length > 0 ? (
          <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              상세 명단 보기
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detailSlots.map((slot) => (
                <SlotRoster key={`${slot.date}:${slot.hour}`} slot={slot} />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
