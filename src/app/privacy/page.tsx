import type { Metadata } from "next";
import { PageHeader, SectionPanel, pageShellClassName } from "@/components/ui";

export const metadata: Metadata = {
  title: "개인정보 처리 안내 | 로스트아크 공대관리",
  description: "Lost Ark Party가 처리하는 계정, 공대 운영, Google 광고 서비스 관련 정보를 안내합니다.",
};

export default function PrivacyPage() {
  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="이 안내는 Lost Ark Party를 이용할 때 어떤 정보가 저장되고 어떤 목적으로 사용되는지 설명합니다."
        eyebrow="개인정보"
        title="개인정보 처리 안내"
      />
      <div className="mt-6 grid gap-4">
        <SectionPanel title="처리하는 정보">
          <ul className="grid gap-3 text-sm leading-6 text-slate-600">
            <li>회원가입과 로그인에 필요한 이메일, 표시 이름, 비밀번호 인증 정보</li>
            <li>공대 생성, 초대, 멤버 역할, 가능 시간, 레이드 일정, 출석 상태</li>
            <li>공대원이 직접 등록한 로스트아크 캐릭터명, 서버, 아이템 레벨, 레이드 참여 정보</li>
            <li>디스코드 알림을 연결한 경우 알림 전송에 필요한 연결 상태와 전송 결과</li>
          </ul>
        </SectionPanel>
        <SectionPanel title="Google 광고 서비스">
          <div className="grid gap-3 text-sm leading-6 text-slate-600">
            <p>
              이 사이트는 Google AdSense 검토와 광고 게재를 위해 Google 광고
              스크립트와 게시자 식별자를 사용할 수 있습니다. Google을 포함한
              제3자는 광고 제공 과정에서 쿠키, 웹 비콘, IP 주소 또는 기타
              식별자를 사용해 정보를 수집하거나 읽을 수 있습니다.
            </p>
            <p>
              Google이 파트너 사이트 또는 앱의 정보를 사용하는 방식은{" "}
              <a
                className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:text-teal-800"
                href="https://policies.google.com/technologies/partner-sites"
                rel="noreferrer"
                target="_blank"
              >
                Google 파트너 사이트 데이터 사용 안내
              </a>
              에서 확인할 수 있습니다.
            </p>
          </div>
        </SectionPanel>
        <SectionPanel title="이용 목적과 보관">
          <p className="text-sm leading-6 text-slate-600">
            저장된 정보는 공대 일정 조율, 초대 링크 관리, 캐릭터 확인, 알림 전송,
            보안 점검, 서비스 운영 문의 대응에 사용됩니다. 공대 운영에 필요한
            기록은 계정 또는 공대 삭제 요청이 처리될 때 함께 정리됩니다.
          </p>
        </SectionPanel>
        <SectionPanel title="이용자 요청">
          <p className="text-sm leading-6 text-slate-600">
            계정, 공대, 캐릭터, 일정 기록의 수정 또는 삭제가 필요하면 가입한
            공대의 공대장에게 먼저 요청해 주세요. 사이트 운영 또는 공개 페이지
            관련 문의는 문의 페이지의 안내에 따라 전달할 수 있습니다.
          </p>
        </SectionPanel>
      </div>
    </main>
  );
}
