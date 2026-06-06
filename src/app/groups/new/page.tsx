import { redirect } from "next/navigation";
import {
  getCurrentUser,
  requireCurrentUser,
  setCurrentMemberSession,
} from "@/server/auth-context";
import {
  SectionPanel,
  inputClassName,
  narrowPageShellClassName,
  narrowWideContentClassName,
  primaryButtonClassName,
} from "@/components/ui";
import { createGroupWithLeader } from "@/server/groups";

export default async function NewGroupPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signup?next=/groups/new");
  }

  async function createGroup(formData: FormData) {
    "use server";
    const currentUser = await requireCurrentUser();
    const result = await createGroupWithLeader({
      groupName: String(formData.get("groupName") ?? ""),
      leaderNickname: String(formData.get("leaderNickname") ?? ""),
      userId: currentUser.id,
    });
    await setCurrentMemberSession(result.leader.id);
    redirect("/settings");
  }

  return (
    <main className={narrowPageShellClassName}>
      <SectionPanel
        className={narrowWideContentClassName}
        description="공대 생성 후 초대 링크와 기본 설정을 관리할 수 있습니다."
        title="새 공대 만들기"
      >
        <form action={createGroup} className="grid gap-3">
          <input
            className={inputClassName}
            minLength={2}
            name="groupName"
            placeholder="공대 이름"
            required
          />
          <input
            className={inputClassName}
            minLength={2}
            name="leaderNickname"
            placeholder="내 닉네임"
            required
          />
          <button className={primaryButtonClassName}>공대 생성</button>
        </form>
      </SectionPanel>
    </main>
  );
}
