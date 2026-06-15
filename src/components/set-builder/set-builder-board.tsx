import {
  RaidSetCard,
  type RaidSetAssignmentOption,
  type RaidSetCardView,
} from "@/components/set-builder/raid-set-card";
import {
  EmptyState,
  SectionPanel,
  balancedCardGridClassName,
  balancedPanelGridClassName,
  cx,
  inputClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/ui";
import { formatRaidTemplateLabel } from "@/lib/raid-template-display";

type RaidTemplateOption = {
  readonly id: string;
  readonly name: string;
  readonly difficulty: string;
  readonly gates: string;
};

export function SetBuilderBoard({
  assignmentOptions = [],
  assignSlotAction,
  canManageSets = true,
  clearSlotAction,
  createSetAction,
  deleteSetAction,
  markAbsentAction,
  raidSets,
  templates = [],
  weekStartDate,
}: {
  readonly assignmentOptions?: readonly RaidSetAssignmentOption[];
  readonly assignSlotAction?: (formData: FormData) => Promise<void>;
  readonly canManageSets?: boolean;
  readonly clearSlotAction?: (formData: FormData) => Promise<void>;
  readonly createSetAction?: (formData: FormData) => Promise<void>;
  readonly deleteSetAction?: (formData: FormData) => Promise<void>;
  readonly markAbsentAction?: (formData: FormData) => Promise<void>;
  readonly raidSets: readonly RaidSetCardView[];
  readonly templates?: readonly RaidTemplateOption[];
  readonly weekStartDate?: string;
}) {
  return (
    <div className={cx("mt-5", balancedPanelGridClassName)}>
      {canManageSets ? (
        <SectionPanel title="세트 추가">
          <form action={createSetAction} className="grid gap-3">
            <input name="weekStartDate" type="hidden" value={weekStartDate ?? ""} />
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              레이드
              <select
                className={selectClassName}
                disabled={templates.length === 0}
                name="templateId"
                required
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {formatRaidTemplateLabel(template)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              세트 이름
              <input
                className={inputClassName}
                name="label"
                placeholder="아칸 1파티"
                required
              />
            </label>
            <button
              className={primaryButtonClassName}
              disabled={templates.length === 0}
            >
              세트 추가
            </button>
          </form>
        </SectionPanel>
      ) : null}

      <SectionPanel title="이번 주 편성">
        {raidSets.length === 0 ? (
          <EmptyState title="아직 이번 주 편성이 없습니다." />
        ) : (
          <div className={balancedCardGridClassName}>
            {raidSets.map((raidSet) => (
              <RaidSetCard
                assignmentOptions={assignmentOptions}
                assignSlotAction={assignSlotAction}
                canManageSets={canManageSets}
                clearSlotAction={clearSlotAction}
                deleteAction={deleteSetAction}
                key={raidSet.id}
                markAbsentAction={markAbsentAction}
                raidSet={raidSet}
              />
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
