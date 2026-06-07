import {
  Badge,
  EmptyState,
  PageHeader,
  SectionPanel,
  pageShellClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { requireCurrentMember } from "@/server/auth-context";
import { db } from "@/server/db";
import { getDiscordAuthorizeUrl } from "@/server/discord-oauth";
import { sendTestNotificationDm } from "@/server/notifications";

const statusLabels: Record<string, string> = {
  PENDING: "대기",
  SENT: "전송 완료",
  FAILED: "실패",
  CANCELED: "취소",
};

const typeLabels: Record<string, string> = {
  MISSING_AVAILABILITY: "가능 시간 조율 전",
  REMINDER: "레이드 알림",
  SCHEDULE_CREATED: "일정 생성 알림",
};

function countByStatus(jobs: Array<{ status: string }>) {
  return jobs.reduce(
    (counts, job) => ({
      ...counts,
      [job.status]: (counts[job.status] ?? 0) + 1,
    }),
    {} as Record<string, number>,
  );
}

export default async function NotificationsPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/notifications" });
  const jobs = await db.notificationJob.findMany({
    where:
      member.role === "LEADER"
        ? { groupId: member.groupId }
        : { groupId: member.groupId, memberId: member.id },
    include: { member: true, schedule: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const discordUrl = member.discordUserId
    ? null
    : getDiscordAuthorizeUrl(member.id);
  const statusCounts = countByStatus(jobs);

  async function sendTestDm() {
    "use server";
    const current = await requireCurrentMember();
    await sendTestNotificationDm(current.id);
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="디스코드 연결 상태와 발송 내역을 확인합니다."
        title="알림 설정"
      />
      <SectionPanel className="mt-6" title="디스코드 DM">
        {member.discordUserId ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              디스코드 계정이 연결되어 있습니다.
            </p>
            <form action={sendTestDm}>
              <button className={secondaryButtonClassName}>
                테스트 DM 보내기
              </button>
            </form>
          </div>
        ) : !discordUrl ? (
          <p className="text-sm text-slate-600">
            디스코드 OAuth 환경 변수를 설정하면 계정을 연결할 수 있습니다.
          </p>
        ) : (
          <a
            className={primaryButtonClassName}
            href={discordUrl}
          >
            디스코드 연결
          </a>
        )}
      </SectionPanel>
      <SectionPanel className="mt-6" title="알림 내역">
        {jobs.length === 0 ? (
          <EmptyState title="아직 생성된 알림이 없습니다." />
        ) : (
          <div>
            <div
              aria-label="알림 발송 상태 요약"
              className="mb-4 flex flex-wrap gap-2"
            >
              <Badge tone="warning">{`발송 대기 ${statusCounts.PENDING ?? 0}`}</Badge>
              <Badge tone="success">{`발송 성공 ${statusCounts.SENT ?? 0}`}</Badge>
              <Badge tone="danger">{`실패 ${statusCounts.FAILED ?? 0}`}</Badge>
            </div>
            <div className="divide-y divide-zinc-100">
              {jobs.map((job) => (
                <div className="py-3 first:pt-0 last:pb-0" key={job.id}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium text-slate-950">
                      {typeLabels[job.type] ?? job.type}
                    </div>
                    <Badge
                      tone={
                        job.status === "SENT"
                          ? "success"
                          : job.status === "FAILED"
                            ? "danger"
                            : job.status === "PENDING"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {statusLabels[job.status] ?? job.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {job.member.nickname}
                    {job.schedule?.title ? ` / ${job.schedule.title}` : ""}
                  </div>
                  {job.failureReason ? (
                    <div className="mt-1 text-sm text-rose-700">
                      {job.failureReason}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionPanel>
    </main>
  );
}
