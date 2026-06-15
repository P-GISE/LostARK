import { revalidatePath } from "next/cache";
import { SetBuilderBoard } from "@/components/set-builder/set-builder-board";
import { PageHeader, pageShellClassName } from "@/components/ui";
import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import { requireCurrentMember } from "@/server/auth-context";
import {
  createRaidSetFromTemplate,
  listRaidSetsForWeek,
} from "@/server/raid-sets";
import { listRaidTemplates } from "@/server/raid-templates";

export default async function SetsPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/sets" });
  const weekStartDate = getLostArkWeekStartDate();
  const [templates, raidSets] = await Promise.all([
    listRaidTemplates(member.groupId),
    listRaidSetsForWeek(member.groupId, weekStartDate),
  ]);

  async function createSet(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await createRaidSetFromTemplate({
      actorMemberId: current.id,
      label: String(formData.get("label") ?? ""),
      templateId: String(formData.get("templateId") ?? ""),
      weekStartDate: String(formData.get("weekStartDate") ?? weekStartDate),
    });
    revalidatePath("/sets");
    revalidatePath("/weekly");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="레이드 템플릿으로 이번 주 공대 편성을 만들고 배정 상태를 확인합니다."
        eyebrow={weekStartDate}
        title="공대 편성"
      />
      <SetBuilderBoard
        createSetAction={createSet}
        raidSets={raidSets}
        templates={templates}
        weekStartDate={weekStartDate}
      />
    </main>
  );
}
