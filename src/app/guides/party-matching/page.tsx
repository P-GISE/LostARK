import type { Metadata } from "next";
import Link from "next/link";
import {
  PageHeader,
  SectionPanel,
  pageShellClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "공대 편성 사용 가이드 | 로스트아크 공대관리",
  description:
    "가능시간 입력, 수강신청, 자동 공대 편성, 추천 시간 확인, 일정 확정까지 이어지는 공대 편성 흐름을 안내합니다.",
};

const workflowSteps = [
  {
    title: "1. 가능시간을 먼저 입력합니다",
    description:
      "공대원은 가능시간 화면에서 이번 주에 실제로 출발할 수 있는 시간을 표시합니다. 가능, 조율, 불가를 구분해 두면 편성 후 추천 시간이 더 정확해집니다.",
  },
  {
    title: "2. 수강신청을 엽니다",
    description:
      "공대장은 신청 화면에서 레이드 템플릿, 파티 인원, 최대 파티 수를 정해 신청을 엽니다. 신청자는 참여할 캐릭터를 선택해서 신청합니다.",
  },
  {
    title: "3. 신청자를 자동 편성합니다",
    description:
      "신청이 충분히 모이면 배정 버튼으로 공대 초안을 만듭니다. 시스템은 기존 신청순 범위 안에서 가능시간이 많이 겹치는 신청자끼리 먼저 묶습니다.",
  },
  {
    title: "4. 공대별 추천 시간을 확인합니다",
    description:
      "편성 화면의 각 공대 카드에서 추천 시간을 확인합니다. 불가 인원과 일정 충돌이 없는 시간이 우선 표시되고, 미입력자는 따로 드러납니다.",
  },
  {
    title: "5. 최종 일정을 확정합니다",
    description:
      "추천 시간 중 실제 출발할 시간을 고른 뒤 일정을 확정합니다. 확정된 공대는 일반 일정으로 전환되어 출석과 알림 흐름을 그대로 사용합니다.",
  },
] as const;

const leaderChecklist = [
  "신청을 배정하기 전에 주요 인원이 가능시간을 입력했는지 확인합니다.",
  "자동 편성 후 역할, 캐릭터 레벨, 보석 등 실제 출발 조건을 한 번 더 봅니다.",
  "추천 시간에 미입력자가 있으면 디스코드나 단톡에서 확인한 뒤 확정합니다.",
  "확정 후 변경이 생기면 기존 일정을 취소하거나 공대 편성에서 다시 조율합니다.",
] as const;

const quickLinks = [
  {
    href: "/calendar",
    label: "가능시간 입력",
    text: "공대원이 먼저 표시해야 하는 주간 출발 가능 시간입니다.",
  },
  {
    href: "/signup",
    label: "수강신청 열기",
    text: "공대장이 레이드별 신청을 만들고 신청자를 모읍니다.",
  },
  {
    href: "/sets",
    label: "공대편성 확인",
    text: "자동 배정된 공대와 추천 출발 시간을 확인합니다.",
  },
] as const;

export default function PartyMatchingGuidePage() {
  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="가능시간을 모은 뒤 수강신청으로 인원을 받고, 겹치는 시간 기준으로 공대 초안을 만든 다음 추천 시간으로 일정을 확정하는 흐름입니다."
        eyebrow="공개 가이드"
        title="공대 편성 사용 가이드"
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-4">
          {workflowSteps.map((step) => (
            <SectionPanel key={step.title} title={step.title}>
              <p className="text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </SectionPanel>
          ))}
        </div>

        <aside className="grid content-start gap-4">
          <SectionPanel
            description="자동 편성은 출발 가능한 시간대를 찾는 보조 도구입니다."
            title="공대장 체크"
          >
            <ul className="grid gap-3">
              {leaderChecklist.map((item) => (
                <li className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionPanel>

          <SectionPanel title="바로가기">
            <div className="grid gap-3">
              {quickLinks.map((link) => (
                <Link
                  className="block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-teal-300 hover:bg-teal-50"
                  href={link.href}
                  key={link.href}
                >
                  <span className="text-sm font-semibold text-slate-950">
                    {link.label}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">
                    {link.text}
                  </span>
                </Link>
              ))}
            </div>
          </SectionPanel>
        </aside>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link className={primaryButtonClassName} href="/signup">
          수강신청 열기
        </Link>
        <Link className={secondaryButtonClassName} href="/guides/raid-schedule">
          일정 조율 가이드
        </Link>
      </div>
    </main>
  );
}
