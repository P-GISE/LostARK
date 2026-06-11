import type { Metadata } from "next";
import Link from "next/link";
import {
  PageHeader,
  SectionPanel,
  pageShellClassName,
  secondaryButtonClassName,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "운영 문의 | 로스트아크 공대관리",
  description: "Lost Ark Party 서비스 운영, 개인정보, 공대 가입 관련 문의 경로를 안내합니다.",
};

export default function ContactPage() {
  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="문의 유형에 따라 가장 빠르게 확인할 수 있는 경로를 정리했습니다."
        eyebrow="문의"
        title="운영 문의"
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          [
            "공대 가입과 일정",
            "초대 링크, 출석 상태, 캐릭터 등록 문제는 가입한 공대의 공대장에게 먼저 문의해 주세요. 공대별 운영 기준은 각 공대장이 관리합니다.",
          ],
          [
            "계정과 개인정보",
            "계정 삭제, 공대 기록 정리, 개인정보 처리 문의는 공대장에게 요청한 뒤 사이트 운영자 검토가 필요한 항목으로 전달할 수 있습니다.",
          ],
          [
            "서비스 오류",
            "공개 페이지, 로그인, 일정 표시, 알림 전송 오류는 재현 경로와 화면 주소를 함께 남기면 확인이 빠릅니다.",
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
      </div>
      <SectionPanel className="mt-6" title="공개 저장소 문의">
        <div className="grid gap-3 text-sm leading-6 text-slate-600">
          <p>
            사이트 자체의 오류나 공개 문서 수정 요청은 GitHub 저장소의 이슈로
            남길 수 있습니다. 계정 비밀번호, 개인 연락처, 비공개 공대 일정 같은
            민감한 정보는 공개 이슈에 포함하지 마세요.
          </p>
          <a
            className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:text-teal-800"
            href="https://github.com/P-GISE/LostARK/issues"
            rel="noreferrer"
            target="_blank"
          >
            GitHub 이슈로 문의하기
          </a>
        </div>
      </SectionPanel>
      <div className="mt-6">
        <Link className={secondaryButtonClassName} href="/privacy">
          개인정보 처리 안내
        </Link>
      </div>
    </main>
  );
}
