import {
  RaidSetRecommendations,
  type RaidSetTimeRecommendationView,
} from "@/components/set-builder/raid-set-recommendations";
import {
  Badge,
  dangerButtonClassName,
  inputClassName,
  secondaryButtonClassName,
  selectClassName,
} from "@/components/ui";
import { formatRaidTemplateLabel } from "@/lib/raid-template-display";

export type { RaidSetTimeRecommendationView };

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
  readonly timeRecommendations?: readonly RaidSetTimeRecommendationView[];
};

export type RaidSetAssignmentOption = {
  readonly characterId: string;
  readonly memberId: string;
  readonly nickname: string;
  readonly name: string;
  readonly className: string;
  readonly role: string;
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

function assignmentOptionText(option: RaidSetAssignmentOption) {
  return `${option.nickname} · ${option.name} · ${option.className}`;
}

export function RaidSetCard({
  assignmentOptions = [],
  assignSlotAction,
  canConfirmSchedules = false,
  canManageSets = false,
  clearSlotAction,
  confirmScheduleAction,
  deleteAction,
  markAbsentAction,
  raidSet,
}: {
  readonly assignmentOptions?: readonly RaidSetAssignmentOption[];
  readonly assignSlotAction?: (formData: FormData) => Promise<void>;
  readonly canConfirmSchedules?: boolean;
  readonly canManageSets?: boolean;
  readonly clearSlotAction?: (formData: FormData) => Promise<void>;
  readonly confirmScheduleAction?: (formData: FormData) => Promise<void>;
  readonly deleteAction?: (formData: FormData) => Promise<void>;
  readonly markAbsentAction?: (formData: FormData) => Promise<void>;
  readonly raidSet: RaidSetCardView;
}) {
  const canAssignSlots = canManageSets && assignmentOptions.length > 0;
  const timeRecommendations = raidSet.timeRecommendations ?? [];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{raidSet.label}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {formatRaidTemplateLabel(raidSet.template)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(raidSet.status)}>{raidSet.status}</Badge>
          {canManageSets ? (
            <form action={deleteAction}>
              <input name="raidSetId" type="hidden" value={raidSet.id} />
              <button className={dangerButtonClassName}>삭제</button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {raidSet.slots.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            아직 편성 자리가 없습니다.
          </div>
        ) : (
          raidSet.slots.map((slot) => (
            <div
              className="grid gap-1 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm sm:grid-cols-[8rem_1fr]"
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
              {canManageSets ? (
                <div className="grid gap-2 border-t border-slate-200/80 pt-2 sm:col-span-2">
                  <form
                    action={assignSlotAction}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <input name="slotId" type="hidden" value={slot.id} />
                    <select
                      aria-label={`${slot.label} 배정 캐릭터`}
                      className={selectClassName}
                      disabled={!canAssignSlots}
                      name="characterId"
                      required
                    >
                      <option value="">캐릭터 선택</option>
                      {assignmentOptions.map((option) => (
                        <option
                          key={option.characterId}
                          value={option.characterId}
                        >
                          {assignmentOptionText(option)}
                        </option>
                      ))}
                    </select>
                    <button
                      className={secondaryButtonClassName}
                      disabled={!canAssignSlots}
                    >
                      배정
                    </button>
                  </form>
                  <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                    <form action={clearSlotAction}>
                      <input name="slotId" type="hidden" value={slot.id} />
                      <button
                        className={secondaryButtonClassName}
                        disabled={!slot.assignedCharacter && !slot.absent}
                      >
                        비우기
                      </button>
                    </form>
                    <form
                      action={markAbsentAction}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <input name="slotId" type="hidden" value={slot.id} />
                      <input
                        aria-label={`${slot.label} 불참 사유`}
                        className={inputClassName}
                        name="absentReason"
                        placeholder="불참 사유"
                      />
                      <button className={secondaryButtonClassName}>불참</button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      <RaidSetRecommendations
        canConfirm={canConfirmSchedules && raidSet.status === "DRAFT"}
        confirmScheduleAction={confirmScheduleAction}
        raidSetId={raidSet.id}
        recommendations={timeRecommendations}
      />
    </article>
  );
}
