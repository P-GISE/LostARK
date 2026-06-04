"use client";

import { useState } from "react";

type Status = "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";

const hours = Array.from({ length: 10 }, (_, index) => index + 16);
const labels: Record<Status, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  TENTATIVE: "Tentative",
};

export function AvailabilityGrid({
  date,
  onChange,
}: {
  date: string;
  onChange: (change: { date: string; hour: number; status: Status }) => void;
}) {
  const [status, setStatus] = useState<Status>("AVAILABLE");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(Object.keys(labels) as Status[]).map((key) => (
          <button
            className="rounded border border-zinc-300 px-3 py-1 text-sm"
            key={key}
            onClick={() => setStatus(key)}
            type="button"
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {hours.map((hour) => (
          <button
            className="rounded border border-zinc-200 px-3 py-4 text-left text-sm hover:bg-zinc-50"
            key={hour}
            onClick={() => onChange({ date, hour, status })}
            type="button"
          >
            {hour}:00
          </button>
        ))}
      </div>
    </div>
  );
}
