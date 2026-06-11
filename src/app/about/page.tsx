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
  title: "서비스 소개 | 로스트아크 공대관리",
  description: "로스트아크 고정 공대 운영을 돕는 Lost Ark Party의 목적과 운영 원칙을 안내합니다.",
};

export default function AboutPage() {
  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="Lost Ark Party는 고정 공대의 반복 업무를 줄이고, 일정 결정 과정을 공대원 모두가 확인할 수 있게 만드는 비공식 운영 도구입니다."
        eyebrow="서비스 소개"
        title="로스트아크 공대 운영을 기록으로 남깁니다"
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <SectionPanel title="운영 원칙">
          <div className="grid gap-4 text-sm leading-6 text-slate-600">
            <p>
              고정 공대 운영은 매주 같은 질문을 반복합니다. 누가 언제 가능한지,
              어떤 캐릭터가 어떤 레이드에 갈 수 있는지, 빈 슬롯은 어디인지,
              확정된 일정이 공대원에게 전달되었는지를 확인해야 합니다.
            </p>
            <p>
              이 사이트는 그 정보를 한곳에 모아 공대장이 임의로 기억하거나
              채팅 기록을 뒤지는 시간을 줄이는 데 초점을 둡니다. 공개 페이지는
              서비스의 목적과 운영 기준을 설명하고, 실제 공대 데이터는 로그인한
              멤버에게만 제공됩니다.
            </p>
          </div>
        </SectionPanel>
        <SectionPanel title="다루는 정보">
          <ul className="grid gap-3 text-sm leading-6 text-slate-600">
            <li>공대별 주간 가능 시간과 확정 일정</li>
            <li>공대원이 등록한 캐릭터명, 아이템 레벨, 레이드 참여 가능 여부</li>
            <li>디스코드 알림 연결 상태와 전송 결과</li>
            <li>초대 링크를 통한 공대 가입 흐름</li>
          </ul>
        </SectionPanel>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          ["투명한 일정", "가능 시간과 출석 상태를 같은 화면에서 확인해 일정 확정 기준을 분명하게 만듭니다."],
          ["수동 검토", "공대장과 공대원이 직접 입력한 자료를 기준으로 운영하며 자동 생성 콘텐츠를 공개 콘텐츠로 사용하지 않습니다."],
          ["비공식 팬 도구", "Lost Ark Party는 Smilegate RPG 또는 STOVE의 공식 서비스가 아니며, 게임 운영사와 제휴되어 있지 않습니다."],
        ].map(([title, description]) => (
          <article
            className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/70"
            key={title}
          >
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link className={primaryButtonClassName} href="/guides/raid-schedule">
          일정 조율 가이드
        </Link>
        <Link className={secondaryButtonClassName} href="/privacy">
          개인정보 처리 안내
        </Link>
      </div>
    </main>
  );
}
