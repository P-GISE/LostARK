import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { ScheduleCard } from "@/components/schedule-card";
import {
  Badge,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionPanel,
  balancedCardGridClassName,
  cx,
  pageShellClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { getCurrentMember, getCurrentUser } from "@/server/auth-context";
import { getDashboardSummary } from "@/server/dashboard";

type TaskTone = "neutral" | "success" | "warning" | "danger" | "info";

type RoleTask = {
  actionLabel: string;
  description: string;
  href: string;
  meta: string;
  title: string;
  tone: TaskTone;
};

const publicRolePanels = [
  {
    actionLabel: "공대 만들기",
    description: "주간 일정, 공대 편성, 알림 실패까지 출발 전 운영 항목을 묶어서 봅니다.",
    href: "/groups/new",
    items: ["주간 일정 확정", "공대 편성 점검", "가능 시간 미입력 확인"],
    title: "공대장 업무",
    tone: "info" as const,
  },
  {
    actionLabel: "초대 후 참여",
    description: "내 가능 시간, 레이드 신청, 캐릭터 숙제를 같은 흐름에서 갱신합니다.",
    href: "/auth/signup",
    items: ["내 가능 시간 입력", "레이드 신청 상태 확인", "숙제 체크 갱신"],
    title: "공대원 업무",
    tone: "success" as const,
  },
];

const weeklyFlow = [
  ["월", "가능 시간 수집", "공대원이 이번 주 실제 출발 가능한 시간대를 등록"],
  ["화", "신청 정리", "레이드별 신청과 캐릭터 조건을 같은 기준으로 확인"],
  ["수", "편성 확정", "빈 슬롯, 대체 인원, 알림 실패를 출발 전에 점검"],
  ["목", "리셋 후 숙제", "완료 상태를 갱신하고 다음 주 반복 업무로 넘김"],
];

function PublicRolePanel({
  actionLabel,
  description,
  href,
  items,
  title,
  tone,
}: {
  actionLabel: string;
  description: string;
  href: string;
  items: string[];
  title: string;
  tone: TaskTone;
}) {
  return (
    <SectionPanel
      action={<Badge tone={tone}>역할</Badge>}
      description={description}
      title={title}
    >
      <div className="divide-y divide-slate-100 rounded-md border border-slate-100">
        {items.map((item) => (
          <div className="px-3 py-2.5 text-sm font-medium text-slate-800" key={item}>
            {item}
          </div>
        ))}
      </div>
      <Link className={cx(secondaryButtonClassName, "mt-3")} href={href}>
        {actionLabel}
      </Link>
    </SectionPanel>
  );
}

function RoleTaskList({ tasks }: { tasks: RoleTask[] }) {
  return (
    <div className="divide-y divide-slate-100 rounded-md border border-slate-100">
      {tasks.map((task) => (
        <Link
          className="group grid gap-1.5 px-3 py-3 transition hover:bg-slate-50"
          href={task.href}
          key={task.title}
        >
          <span className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-sm font-semibold text-slate-950">{task.title}</span>
            <Badge tone={task.tone}>{task.meta}</Badge>
          </span>
          <span className="text-sm leading-6 text-slate-600">{task.description}</span>
          <span className="text-xs font-semibold text-teal-800 transition group-hover:text-teal-950">
            {task.actionLabel}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const member = await getCurrentMember();
  const user = member ? null : await getCurrentUser();

  if (!member) {
    return (
      <main className={pageShellClassName}>
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.86fr)] lg:items-start">
          <div className="min-w-0 py-2 lg:pr-6">
            <div className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
              LOST ARK PARTY
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              공대장과 공대원이 같은 주간판을 봅니다
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Lost Ark Party는 고정 공대장이 매주 반복하는 가능 시간 조사,
              레이드 신청, 공대 편성, 캐릭터 숙제 확인을 역할별 업무 흐름으로
              정리하는 한국어 운영 도구입니다. 공개 페이지는 운영 기준을 설명하고,
              가입 후에는 공대 내부 자료만 따로 관리합니다.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
          <div className="grid gap-3">
            {publicRolePanels.map((panel) => (
              <PublicRolePanel key={panel.title} {...panel} />
            ))}
          </div>
        </section>
        <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <SectionPanel
            action={<Badge tone="info">목요일 리셋</Badge>}
            description="출발 전 확인할 항목을 요일별로 좁혀 봅니다."
            title="주간 운영판 예시"
          >
            <div className="grid gap-2">
              {weeklyFlow.map(([day, title, description]) => (
                <div className="grid grid-cols-[2.5rem_1fr] gap-3 px-1 py-2" key={day}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
                    {day}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{title}</div>
                    <div className="mt-0.5 text-sm leading-6 text-slate-600">
                      {description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionPanel>
          <SectionPanel
            description="광고 심사와 검색 노출에 필요한 공개 안내는 유지하고, 실제 공대 기록은 멤버에게만 보여줍니다."
            title="고정 공대 운영 체크리스트"
          >
            <div className="grid gap-2 text-sm leading-6 text-slate-600">
              <p>
                출발 전 확인해야 할 가능 시간, 레이드 템플릿, 참여 캐릭터,
                알림 상태를 같은 기준으로 정리합니다.
              </p>
              <p>
                이 사이트는 로스트아크 공대 운영을 돕는 비공식 도구이며
                Smilegate RPG 또는 STOVE와 제휴되어 있지 않습니다.
              </p>
            </div>
          </SectionPanel>
        </section>
      </main>
    );
  }

  const summary = await getDashboardSummary(member.groupId);
  const upcomingScheduleCount = summary.upcomingSchedules.length;
  const memberRoleText = member.role === "LEADER" ? "공대장" : "공대원";
  const missingAvailabilityTone =
    summary.missingAvailabilityCount > 0 ? "warning" : "success";
  const failedNotificationTone = summary.failedNotifications > 0 ? "danger" : "success";
  const leaderTasks: RoleTask[] = [
    {
      actionLabel: "주간 일정 열기",
      description: "확정 일정과 아직 시간 배정이 안 된 공대 편성을 함께 확인합니다.",
      href: "/weekly",
      meta: `${upcomingScheduleCount}건`,
      title: "이번 주 일정 확정",
      tone: upcomingScheduleCount > 0 ? "success" : "warning",
    },
    {
      actionLabel: "편성 보드 열기",
      description: "레이드별 슬롯, 캐릭터, 대체 인원을 출발 전 기준으로 맞춥니다.",
      href: "/sets",
      meta: `${summary.memberCount}명`,
      title: "공대 편성 점검",
      tone: "info",
    },
    {
      actionLabel: "가능 시간 보기",
      description: "이번 주 가능 시간을 아직 입력하지 않은 인원을 확인합니다.",
      href: "/calendar",
      meta: `${summary.missingAvailabilityCount}명`,
      title: "가능 시간 미입력 확인",
      tone: missingAvailabilityTone,
    },
    {
      actionLabel: "알림 상태 보기",
      description: "Discord 알림 실패가 있으면 재전송 전 설정을 점검합니다.",
      href: "/notifications",
      meta: `${summary.failedNotifications}건`,
      title: "실패 알림 처리",
      tone: failedNotificationTone,
    },
  ];
  const memberTasks: RoleTask[] = [
    {
      actionLabel: "내 시간 갱신",
      description: "이번 주 실제로 출발 가능한 시간과 조율 가능한 시간을 표시합니다.",
      href: "/calendar",
      meta: "이번 주",
      title: "내 가능 시간 입력",
      tone: missingAvailabilityTone,
    },
    {
      actionLabel: "신청판 열기",
      description: "열려 있는 레이드 신청에 내 캐릭터와 메모를 남깁니다.",
      href: "/signup",
      meta: "참여",
      title: "레이드 신청 확인",
      tone: "info",
    },
    {
      actionLabel: "숙제판 열기",
      description: "캐릭터별 주간 레이드 완료 상태를 공대 기준으로 맞춥니다.",
      href: "/homework",
      meta: "주간",
      title: "숙제 체크 갱신",
      tone: "success",
    },
    {
      actionLabel: "명단 확인",
      description: "닉네임, 권한, 캐릭터 등록 상태를 같은 명단에서 확인합니다.",
      href: "/members",
      meta: `${summary.memberCount}명`,
      title: "공대원 정보 확인",
      tone: "neutral",
    },
  ];

  return (
    <main className={pageShellClassName}>
      <PageHeader
        action={
          <>
            <Link className={secondaryButtonClassName} href="/calendar">
              가능 시간 입력
            </Link>
            <Link className={primaryButtonClassName} href="/weekly">
              주간판 열기
            </Link>
          </>
        }
        description={`${member.group.name}의 일정, 편성, 신청, 숙제를 공대장과 공대원 업무로 나눠 확인합니다.`}
        eyebrow={`${member.group.name} / ${memberRoleText}`}
        title="오늘의 공대 작업판"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="출발 전 자리와 참석 상태를 확인할 일정"
          label="예정 일정"
          value={upcomingScheduleCount}
        />
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
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionPanel
          action={<Badge tone="info">운영</Badge>}
          description="공대장이 이번 주 출발 전에 확인해야 하는 항목입니다."
          title="공대장 업무"
        >
          <RoleTaskList tasks={leaderTasks} />
        </SectionPanel>
        <SectionPanel
          action={<Badge tone="success">참여</Badge>}
          description="공대원이 직접 갱신하거나 확인해야 하는 항목입니다."
          title="공대원 업무"
        >
          <RoleTaskList tasks={memberTasks} />
        </SectionPanel>
      </section>
      <SectionPanel
        className="mt-5"
        description="확정 일정은 출발 전 자리 배정과 참석 체크를 다시 확인합니다."
        title="다가오는 레이드"
      >
        {summary.upcomingSchedules.length === 0 ? (
          <EmptyState
            action={
              <Link className={secondaryButtonClassName} href="/weekly">
                주간 일정 확인
              </Link>
            }
            description="먼저 가능 시간을 모은 뒤 주간판에서 확정 일정을 만들 수 있습니다."
            title="다가오는 일정이 없습니다."
          />
        ) : (
          <div className={balancedCardGridClassName}>
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
