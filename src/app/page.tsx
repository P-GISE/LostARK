import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { ScheduleCard } from "@/components/schedule-card";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  SectionPanel,
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
      <main className={pageShellClassName}>
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="rounded-lg border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-200/70 sm:p-8">
            <div className="text-sm font-semibold text-teal-700">LOST ARK PARTY</div>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold text-slate-950 sm:text-4xl">
              로스트아크 고정 공대 운영을 한곳에서 정리합니다
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Lost Ark Party는 고정 공대장이 매주 반복하는 가능 시간 조사,
              레이드 일정 확정, 캐릭터 숙제 확인, 참석 상태 공유를 정리하는
              한국어 운영 도구입니다. 공개 페이지에서는 공대 운영 방식과 일정
              조율 기준을 설명하고, 가입 후에는 공대 내부 자료만 따로 관리합니다.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {user ? (
                <>
                  <Link className={primaryButtonClassName} href="/groups/new">
                    새 공대 만들기
                  </Link>
                  <form action={logoutAction}>
                    <button className={secondaryButtonClassName}>
                      로그아웃
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link className={primaryButtonClassName} href="/auth/signup">
                    회원가입
                  </Link>
                  <Link className={secondaryButtonClassName} href="/auth/login">
                    로그인
                  </Link>
                </>
              )}
              <Link className={secondaryButtonClassName} href="/guides/raid-schedule">
                일정 조율 가이드 보기
              </Link>
              <Link className={secondaryButtonClassName} href="/about">
                서비스 소개
              </Link>
            </div>
            {user ? (
              <p className="mt-4 text-sm text-slate-600">
                로그인 계정: {user.displayName}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm shadow-slate-300/70">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-sm font-semibold text-teal-200">주간 운영판</div>
                <div className="mt-1 text-xl font-semibold">목요일 리셋 기준 예시</div>
              </div>
              <div className="rounded-md bg-teal-300 px-2 py-1 text-xs font-semibold text-slate-950">
                공개 예시
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["월", "가능 시간 수집", "공대원이 이번 주 가능한 시간대를 등록"],
                ["화", "캐릭터 확인", "레이드별 필요 레벨과 보유 캐릭터를 대조"],
                ["수", "출석 확정", "대체 인원과 빈 슬롯을 확인하고 일정 고정"],
                ["목", "리셋 후 점검", "완료 상태와 다음 주 반복 일정을 정리"],
              ].map(([day, title, description]) => (
                <div
                  className="grid grid-cols-[2.75rem_1fr] gap-3 rounded-md border border-white/10 bg-white/5 p-3"
                  key={day}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-semibold text-slate-950">
                    {day}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">
                      {description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mt-6 grid gap-3 lg:grid-cols-3">
          {[
            [
              "고정 공대 운영 체크리스트",
              "출발 전 확인해야 할 가능 시간, 레이드 템플릿, 참여 캐릭터, 알림 상태를 같은 기준으로 정리합니다.",
            ],
            [
              "공개 콘텐츠와 내부 데이터 분리",
              "운영 방식과 개인정보 처리 안내는 공개하고, 공대별 일정과 캐릭터 기록은 로그인한 멤버에게만 보여줍니다.",
            ],
            [
              "로스트아크 팬 도구",
              "이 사이트는 로스트아크 공대 운영을 돕는 비공식 도구이며 Smilegate RPG 또는 STOVE와 제휴되어 있지 않습니다.",
            ],
          ].map(([title, description]) => (
            <article
              className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/70"
              key={title}
            >
              <h2 className="text-base font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </section>
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
