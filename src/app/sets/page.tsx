import { revalidatePath } from "next/cache";
import { SetBuilderBoard } from "@/components/set-builder/set-builder-board";
import { PageHeader, pageShellClassName } from "@/components/ui";
import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import { requireCurrentMember } from "@/server/auth-context";
import { canManageSets } from "@/server/group-permissions";
import { listMembers } from "@/server/members";
import {
  assignRaidSetSlot,
  markRaidSetSlotAbsent,
  unassignRaidSetSlot,
} from "@/server/raid-set-slots";
import {
  createRaidSetFromTemplate,
  deleteRaidSet,
  listRaidSetsForWeek,
} from "@/server/raid-sets";
import { listRaidTemplates } from "@/server/raid-templates";

function revalidateSetSurfaces() {
  revalidatePath("/sets");
  revalidatePath("/weekly");
  revalidatePath("/signup");
}

export default async function SetsPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/sets" });
  const weekStartDate = getLostArkWeekStartDate();
  const [templates, raidSets, members, canManageRaidSets] = await Promise.all([
    listRaidTemplates(member.groupId),
    listRaidSetsForWeek(member.groupId, weekStartDate),
    listMembers(member.groupId),
    canManageSets(member.id),
  ]);
  const assignmentOptions = members.flatMap((groupMember) =>
    groupMember.characters.map((character) => ({
      characterId: character.id,
      className: character.className,
      memberId: groupMember.id,
      name: character.name,
      nickname: groupMember.nickname,
      role: character.preferredRole,
    })),
  );

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

  async function assignSetSlot(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await assignRaidSetSlot({
      actorMemberId: current.id,
      characterId: String(formData.get("characterId") ?? ""),
      slotId: String(formData.get("slotId") ?? ""),
    });
    revalidateSetSurfaces();
  }

  async function clearSetSlot(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await unassignRaidSetSlot({
      actorMemberId: current.id,
      slotId: String(formData.get("slotId") ?? ""),
    });
    revalidateSetSurfaces();
  }

  async function markSetSlotAbsent(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await markRaidSetSlotAbsent({
      absentReason: String(formData.get("absentReason") ?? ""),
      actorMemberId: current.id,
      slotId: String(formData.get("slotId") ?? ""),
    });
    revalidateSetSurfaces();
  }

  async function deleteSet(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await deleteRaidSet({
      actorMemberId: current.id,
      raidSetId: String(formData.get("raidSetId") ?? ""),
    });
    revalidateSetSurfaces();
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="직접 만든 편성과 수강 신청 배정 결과를 함께 확인합니다."
        eyebrow={weekStartDate}
        title="공대 편성"
      />
      <SetBuilderBoard
        assignmentOptions={assignmentOptions}
        assignSlotAction={assignSetSlot}
        canManageSets={canManageRaidSets}
        clearSlotAction={clearSetSlot}
        createSetAction={createSet}
        deleteSetAction={deleteSet}
        markAbsentAction={markSetSlotAbsent}
        raidSets={raidSets}
        templates={templates}
        weekStartDate={weekStartDate}
      />
    </main>
  );
}
