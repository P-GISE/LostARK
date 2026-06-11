import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  PageHeader,
  SectionPanel,
  pageShellClassName,
  secondaryButtonClassName,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "레이드 일정 조율 가이드 | 로스트아크 공대관리",
  description: "로스트아크 고정 공대에서 주간 가능 시간, 캐릭터, 출석 상태를 정리하는 방법을 안내합니다.",
};

const planningSteps = [
  {
    title: "1. 주간 기준일을 먼저 고정합니다",
    description:
      "로스트아크 주간 초기화 이후 어떤 요일에 가능 시간을 모을지 정합니다. 기준일이 고정되면 공대원은 같은 리듬으로 입력하고, 공대장은 지난주 기록과 이번 주 변동을 비교하기 쉽습니다.",
  },
  {
    title: "2. 가능 시간은 출발 가능 기준으로 받습니다",
    description:
      "접속 가능 시간과 실제 출발 가능 시간은 다릅니다. 식사, 이동, 숙제 진행 시간을 제외하고 레이드 출발이 가능한 시간만 등록해야 일정 충돌이 줄어듭니다.",
  },
  {
    title: "3. 캐릭터별 참여 가능 레이드를 분리합니다",
    description:
      "본캐와 부캐가 같은 레이드에 갈 수 있어도 역할, 숙련도, 보석 상태가 다를 수 있습니다. 캐릭터별로 가능한 레이드와 우선순위를 분리하면 대체 편성이 쉬워집니다.",
  },
  {
    title: "4. 확정 후 변경 사유를 남깁니다",
    description:
      "일정이 확정된 뒤 변경이 생기면 단순히 시간을 바꾸기보다 결원, 대체 인원, 출발 지연 사유를 남깁니다. 다음 주 같은 문제가 반복되는지 확인할 수 있습니다.",
  },
] as const;

export default function RaidScheduleGuidePage() {
  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="고정 공대 일정은 빠르게 정하는 것보다 모두가 같은 기준을 이해하는 것이 중요합니다. 아래 기준은 공대장이 매주 반복해서 확인할 항목을 정리한 것입니다."
        eyebrow="공개 가이드"
        title="레이드 일정 조율 가이드"
      />
      <div className="mt-6 grid gap-4">
        {planningSteps.map((step) => (
          <SectionPanel key={step.title} title={step.title}>
            <p className="text-sm leading-6 text-slate-600">{step.description}</p>
          </SectionPanel>
        ))}
      </div>
      <section className="mt-6 rounded-lg border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-950">공대장 체크포인트</h2>
          <Badge tone="info">실전 운영</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "출발 24시간 전 미입력 인원을 확인합니다.",
            "동일 시간대에 두 일정이 겹치지 않는지 확인합니다.",
            "필수 시너지와 서포터 슬롯이 비어 있는지 확인합니다.",
            "변경 공지는 디스코드 또는 공대 채팅으로 한 번 더 공유합니다.",
          ].map((item) => (
            <div
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
      <div className="mt-6">
        <Link className={secondaryButtonClassName} href="/about">
          서비스 운영 원칙 보기
        </Link>
      </div>
    </main>
  );
}
