import { Badge } from "@/components/ui";

export type RaidSetSlotView = {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly absent: boolean;
  readonly absentReason?: string | null;
  readonly assignedMember?: { readonly nickname: string } | null;
  readonly assignedCharacter?: {
    readonly name: string;
    readonly className: string;
  } | null;
};

export type RaidSetCardView = {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly template: {
    readonly name: string;
    readonly difficulty: string;
    readonly gates: string;
  };
  readonly slots: readonly RaidSetSlotView[];
};

function statusTone(status: string) {
  if (status === "CONFIRMED") {
    return "success";
  }
  if (status === "CANCELED") {
    return "danger";
  }
  if (status === "SCHEDULED") {
    return "info";
  }
  return "warning";
}

function slotAssignmentText(slot: RaidSetSlotView) {
  if (slot.absent) {
    return slot.absentReason ? `불참 · ${slot.absentReason}` : "불참";
  }
  if (slot.assignedCharacter) {
    return `${slot.assignedCharacter.name} · ${slot.assignedCharacter.className}`;
  }
  return "미배정";
}

export function RaidSetCard({ raidSet }: { readonly raidSet: RaidSetCardView }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{raidSet.label}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {raidSet.template.name} · {raidSet.template.difficulty} ·{" "}
            {raidSet.template.gates}관문
          </p>
        </div>
        <Badge tone={statusTone(raidSet.status)}>{raidSet.status}</Badge>
      </div>
      <div className="mt-4 grid gap-2">
        {raidSet.slots.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            아직 편성 자리가 없습니다.
          </div>
        ) : (
          raidSet.slots.map((slot) => (
            <div
              className="grid gap-1 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm sm:grid-cols-[8rem_1fr]"
              key={slot.id}
            >
              <div className="font-medium text-slate-700">
                {slot.label}
                <span className="ml-2 text-xs text-slate-400">{slot.role}</span>
              </div>
              <div className="text-slate-900">
                {slot.assignedCharacter && !slot.absent ? (
                  <>
                    <span>{slot.assignedCharacter.name}</span>
                    <span className="ml-1 text-xs text-slate-500">
                      {slot.assignedCharacter.className}
                    </span>
                  </>
                ) : (
                  slotAssignmentText(slot)
                )}
                {slot.assignedMember ? (
                  <span className="ml-2 text-xs text-slate-500">
                    {slot.assignedMember.nickname}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
