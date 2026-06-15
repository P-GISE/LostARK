import {
  EmptyState,
  SectionPanel,
  balancedPanelGridClassName,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

type PresetSlotView = {
  readonly id?: string;
  readonly startTime: string;
  readonly endTime: string;
};

type PresetView = {
  readonly id: string;
  readonly name: string;
  readonly mode: string;
  readonly slots: readonly PresetSlotView[];
};

export function AvailabilityPresetsPanel({
  createPresetAction,
  presets,
  saveOverrideAction,
}: {
  readonly createPresetAction?: (formData: FormData) => Promise<void>;
  readonly presets: readonly PresetView[];
  readonly saveOverrideAction?: (formData: FormData) => Promise<void>;
}) {
  return (
    <SectionPanel className="availability-panel mt-5" title="내 프리셋">
      <div className={balancedPanelGridClassName}>
        <div className="grid gap-3">
          {presets.length === 0 ? (
            <EmptyState title="저장된 프리셋이 없습니다." />
          ) : (
            presets.map((preset) => (
              <div
                className="rounded-md border border-slate-200 bg-slate-50/70 p-3"
                key={preset.id}
              >
                <div className="font-semibold text-slate-950">{preset.name}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {preset.mode} · {preset.slots.length}개 시간대
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {preset.slots.map((slot) => (
                    <span
                      className="rounded-md bg-slate-100 px-2 py-1"
                      key={`${slot.startTime}-${slot.endTime}`}
                    >
                      {slot.startTime}-{slot.endTime}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="grid content-start gap-3">
          <form action={createPresetAction} className="grid gap-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              프리셋 이름
              <input
                className={inputClassName}
                defaultValue="평일 저녁"
                name="name"
              />
            </label>
            <input name="dayOfWeek" type="hidden" value="5" />
            <input name="startTime" type="hidden" value="20:00" />
            <input name="endTime" type="hidden" value="23:00" />
            <button className={primaryButtonClassName}>프리셋 만들기</button>
          </form>
          <form action={saveOverrideAction} className="grid gap-2">
            <div className="text-xs font-semibold text-slate-600">빠른 저장</div>
            <input name="dayOfWeek" type="hidden" value="5" />
            <input name="startTime" type="hidden" value="21:00" />
            <input name="endTime" type="hidden" value="23:00" />
            <button className={secondaryButtonClassName}>예외로 저장</button>
            <button className={secondaryButtonClassName} type="button">
              기본값 저장
            </button>
            <button className={secondaryButtonClassName} type="button">
              이 주 설정을 프리셋으로 저장
            </button>
          </form>
        </div>
      </div>
    </SectionPanel>
  );
}
