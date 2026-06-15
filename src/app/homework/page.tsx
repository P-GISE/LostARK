import { revalidatePath } from "next/cache";
import { HomeworkBoard } from "@/components/homework/homework-board";
import { PageHeader, pageShellClassName } from "@/components/ui";
import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import { requireCurrentMember } from "@/server/auth-context";
import { listHomeworkStatus, setHomeworkCompleted } from "@/server/homework";

export default async function HomeworkPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/homework" });
  const weekStartDate = getLostArkWeekStartDate();
  const status = await listHomeworkStatus(member.groupId, weekStartDate);

  async function setHomework(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await setHomeworkCompleted({
      actorMemberId: current.id,
      characterId: String(formData.get("characterId") ?? ""),
      completed: formData.get("completed") === "true",
      raidTemplateId: String(formData.get("raidTemplateId") ?? ""),
      weekStartDate,
    });
    revalidatePath("/homework");
    revalidatePath("/weekly");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="이번 주 캐릭터별 레이드 숙제 완료 상태를 공대 단위로 확인합니다."
        eyebrow={weekStartDate}
        title="숙제 현황"
      />
      <HomeworkBoard
        currentMemberId={member.id}
        setHomeworkAction={setHomework}
        status={status}
      />
    </main>
  );
}
