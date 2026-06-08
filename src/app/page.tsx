import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { ScheduleCard } from "@/components/schedule-card";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  SectionPanel,
  narrowContentClassName,
  narrowPageShellClassName,
  pageShellClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { getCurrentMember, getCurrentUser } from "@/server/auth-context";
import { getDashboardSummary } from "@/server/dashboard";

export default async function HomePage() {
  const member = await getCurrentMember();
  const user = member ? null : await getCurrentUser();

  if (!member) {
    return (
      <main className={narrowPageShellClassName}>
        <div className={`${narrowContentClassName} rounded-lg border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-200/70`}>
          <div className="text-sm font-semibold text-teal-700">LOST ARK PARTY</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            공대 일정과 캐릭터를 한 화면에서 관리합니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            가능 시간, 레이드 일정, 공대원 캐릭터, 알림 설정을 공대 내부에서 확인할 수 있습니다.
          </p>
          {user ? (
            <div className="mt-6 grid gap-2">
              <p className="text-sm text-slate-600">
                로그인 계정: {user.displayName}
              </p>
              <Link className={primaryButtonClassName} href="/groups/new">
                새 공대 만들기
              </Link>
              <form action={logoutAction}>
                <button className={secondaryButtonClassName}>
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-6 grid gap-2">
              <Link className={primaryButtonClassName} href="/auth/signup">
                회원가입
              </Link>
              <Link className={secondaryButtonClassName} href="/auth/login">
                로그인
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  const summary = await getDashboardSummary(member.groupId);

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description={`${member.group.name}의 일정, 출석, 캐릭터 등록 상태를 빠르게 확인합니다.`}
        eyebrow="공대 운영"
        title="대시보드"
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MetricCard
          detail="현재 공대에 참여 중인 인원"
          label="공대원"
          value={summary.memberCount}
        />
        <MetricCard
          detail="이번 주 가능 시간을 아직 조율하지 않은 인원"
          label="가능 시간 조율 전"
          value={summary.missingAvailabilityCount}
        />
        <MetricCard
          detail="재전송 또는 설정 확인이 필요한 알림"
          label="실패 알림"
          value={summary.failedNotifications}
        />
      </div>
      <SectionPanel className="mt-6" title="다가오는 레이드">
        {summary.upcomingSchedules.length === 0 ? (
          <EmptyState title="다가오는 일정이 없습니다." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {summary.upcomingSchedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                title={schedule.title}
                startsAt={schedule.startsAt}
                openSlots={
                  schedule.slots.filter((slot) => !slot.assignedMemberId).length
                }
              />
            ))}
          </div>
        )}
      </SectionPanel>
    </main>
  );
}
