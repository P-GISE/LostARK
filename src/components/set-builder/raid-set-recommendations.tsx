import { Badge, secondaryButtonClassName } from "@/components/ui";

export type RaidSetTimeRecommendationView = {
  readonly availableMembers: readonly string[];
  readonly conflictedMembers: readonly string[];
  readonly date: string;
  readonly hour: number;
  readonly missingMembers: readonly string[];
  readonly recommended: boolean;
  readonly score: number;
  readonly startsAt: string;
  readonly summaryLabel: string;
  readonly tentativeMembers: readonly string[];
  readonly totalMembers: number;
  readonly unavailableMembers: readonly string[];
};

function recommendationTimeText(recommendation: RaidSetTimeRecommendationView) {
  return `${recommendation.date} ${String(recommendation.hour).padStart(2, "0")}:00`;
}

function recommendationTone(recommendation: RaidSetTimeRecommendationView) {
  if (
    recommendation.conflictedMembers.length > 0 ||
    recommendation.unavailableMembers.length > 0
  ) {
    return "danger";
  }
  if (
    recommendation.missingMembers.length > 0 ||
    recommendation.tentativeMembers.length > 0
  ) {
    return "warning";
  }
  return "success";
}

export function RaidSetRecommendations({
  canConfirm,
  confirmScheduleAction,
  raidSetId,
  recommendations,
}: {
  readonly canConfirm: boolean;
  readonly confirmScheduleAction?: (formData: FormData) => Promise<void>;
  readonly raidSetId: string;
  readonly recommendations: readonly RaidSetTimeRecommendationView[];
}) {
  return (
    <section className="mt-4 border-t border-slate-100 pt-3">
      <h4 className="text-sm font-semibold text-slate-900">추천 시간</h4>
      {recommendations.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
          배정된 인원 기준 추천 시간이 아직 없습니다.
        </p>
      ) : (
        <div className="mt-2 grid gap-2">
          {recommendations.map((recommendation) => (
            <div
              className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              key={`${raidSetId}:${recommendation.startsAt}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {recommendationTimeText(recommendation)}
                  </span>
                  <Badge tone={recommendationTone(recommendation)}>
                    {recommendation.summaryLabel}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  가능 {recommendation.availableMembers.length}/
                  {recommendation.totalMembers}
                </p>
              </div>
              {canConfirm ? (
                <form action={confirmScheduleAction}>
                  <input name="raidSetId" type="hidden" value={raidSetId} />
                  <input
                    name="startsAt"
                    type="hidden"
                    value={recommendation.startsAt}
                  />
                  <button
                    className={secondaryButtonClassName}
                    disabled={recommendation.conflictedMembers.length > 0}
                  >
                    이 시간 확정
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
