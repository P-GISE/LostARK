import { EmptyState, MetricCard, balancedCardGridClassName } from "@/components/ui";
import { HomeworkMemberCard } from "@/components/homework/homework-member-card";
import {
  getBoardProgress,
  getProgress,
} from "@/components/homework/homework-progress";
import type { HomeworkStatusView } from "@/components/homework/homework-types";

export type { HomeworkStatusView } from "@/components/homework/homework-types";

export function HomeworkBoard({
  currentMemberId,
  setHomeworkAction,
  status,
}: {
  readonly currentMemberId?: string;
  readonly setHomeworkAction?: (formData: FormData) => Promise<void>;
  readonly status: HomeworkStatusView;
}) {
  const currentMember =
    status.members.find((member) => member.id === currentMemberId) ?? null;
  const groupProgress = getBoardProgress(status.members);
  const boardProgress = currentMember
    ? getProgress(currentMember.completedCount, currentMember.totalCount)
    : groupProgress;
  const thirdMetric = currentMember
    ? {
        detail: "등록된 캐릭터 기준",
        label: "내 캐릭터",
        value: currentMember.characters.length,
      }
    : {
        detail: "모든 캐릭터 숙제 기준",
        label: "완료 멤버",
        value: `${groupProgress.completedMemberCount}/${status.members.length}`,
      };

  return (
    <div className="mt-5 grid gap-4">
      {status.members.length === 0 ? (
        <EmptyState
          description="공대원이 합류하면 캐릭터별 주간 레이드 체크가 여기에 표시됩니다."
          title="아직 공대원이 없습니다."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              detail={`${boardProgress.percent}% 완료`}
              label={currentMember ? "내 완료" : "전체 완료"}
              value={`${boardProgress.completedCount}/${boardProgress.totalCount}`}
            />
            <MetricCard
              detail={
                boardProgress.remainingCount === 0
                  ? "이번 주 체크 완료"
                  : "완료 버튼으로 바로 처리"
              }
              label={currentMember ? "내 남은 숙제" : "남은 숙제"}
              value={boardProgress.remainingCount}
            />
            <MetricCard
              detail={thirdMetric.detail}
              label={thirdMetric.label}
              value={thirdMetric.value}
            />
          </div>
          <div className={`${balancedCardGridClassName} items-start`}>
            {status.members.map((member, index) => (
              <HomeworkMemberCard
                defaultOpen={
                  currentMember
                    ? member.id === currentMember.id
                    : index === 0
                }
                isCurrentMember={member.id === currentMember?.id}
                key={member.id}
                member={member}
                setHomeworkAction={setHomeworkAction}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
