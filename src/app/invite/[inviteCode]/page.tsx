import Link from "next/link";
import { redirect } from "next/navigation";
import {
  EmptyState,
  SectionPanel,
  inputClassName,
  narrowContentClassName,
  narrowPageShellClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import {
  getCurrentUser,
  requireCurrentUser,
  setCurrentMemberSession,
} from "@/server/auth-context";
import { getGroupByInviteCode } from "@/server/groups";
import { joinGroupByInvite } from "@/server/members";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const group = await getGroupByInviteCode(inviteCode);
  const user = await getCurrentUser();
  const nextPath = `/invite/${inviteCode}`;

  async function join(formData: FormData) {
    "use server";
    const currentUser = await requireCurrentUser();
    const inviteCode = String(formData.get("inviteCode") ?? "");
    const nickname = String(formData.get("nickname") ?? "");
    const member = await joinGroupByInvite({
      inviteCode,
      nickname,
      userId: currentUser.id,
    });
    await setCurrentMemberSession(member.id);
    redirect("/");
  }

  if (!group || !group.inviteEnabled) {
    return (
      <main className={narrowPageShellClassName}>
        <div className={narrowContentClassName}>
          <EmptyState title="초대 링크가 잘못되었거나 비활성화되었습니다." />
        </div>
      </main>
    );
  }

  if (!user) {
    const encodedNextPath = encodeURIComponent(nextPath);

    return (
      <main className={narrowPageShellClassName}>
        <SectionPanel
          className={narrowContentClassName}
          description={`${group.name}에 참가하려면 먼저 로그인하거나 계정을 만들어야 합니다.`}
          title="공대 참가"
        >
          <div className="grid gap-2">
            <Link
              className={primaryButtonClassName}
              href={`/auth/signup?next=${encodedNextPath}`}
            >
              회원가입
            </Link>
            <Link
              className={secondaryButtonClassName}
              href={`/auth/login?next=${encodedNextPath}`}
            >
              로그인
            </Link>
          </div>
        </SectionPanel>
      </main>
    );
  }

  return (
    <main className={narrowPageShellClassName}>
      <SectionPanel
        className={narrowContentClassName}
        description={`${group.name}에서 사용할 닉네임을 입력하세요.`}
        title="공대 참가"
      >
        <form action={join} className="space-y-3">
          <input name="inviteCode" type="hidden" value={inviteCode} />
          <input
            className={inputClassName}
            minLength={2}
            name="nickname"
            placeholder="닉네임"
            required
          />
          <button className={primaryButtonClassName}>참가하기</button>
        </form>
      </SectionPanel>
    </main>
  );
}
