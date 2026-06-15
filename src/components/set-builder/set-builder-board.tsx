import { RaidSetCard, type RaidSetCardView } from "@/components/set-builder/raid-set-card";
import {
  EmptyState,
  SectionPanel,
  inputClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/ui";

type RaidTemplateOption = {
  readonly id: string;
  readonly name: string;
  readonly difficulty: string;
  readonly gates: string;
};

export function SetBuilderBoard({
  createSetAction,
  raidSets,
  templates = [],
  weekStartDate,
}: {
  readonly createSetAction?: (formData: FormData) => Promise<void>;
  readonly raidSets: readonly RaidSetCardView[];
  readonly templates?: readonly RaidTemplateOption[];
  readonly weekStartDate?: string;
}) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,24rem)_1fr]">
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
                  {template.name} · {template.difficulty} · {template.gates}관문
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
          <button className={primaryButtonClassName} disabled={templates.length === 0}>
            세트 추가
          </button>
        </form>
      </SectionPanel>

      <SectionPanel title="이번 주 편성">
        {raidSets.length === 0 ? (
          <EmptyState title="아직 이번 주 편성이 없습니다." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {raidSets.map((raidSet) => (
              <RaidSetCard key={raidSet.id} raidSet={raidSet} />
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
