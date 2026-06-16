import { revalidatePath } from "next/cache";
import { SetBuilderBoard } from "@/components/set-builder/set-builder-board";
import { PageHeader, pageShellClassName } from "@/components/ui";
import { availabilityHours } from "@/lib/availability-hours";
import {
  buildLostArkWeekDays,
  getLostArkWeekStartDate,
} from "@/lib/lostark-week";
import { requireCurrentMember } from "@/server/auth-context";
import {
  canConfirmSchedules,
  canManageSets,
} from "@/server/group-permissions";
import { listMembers } from "@/server/members";
import {
  assignRaidSetSlot,
  markRaidSetSlotAbsent,
  unassignRaidSetSlot,
} from "@/server/raid-set-slots";
import {
  confirmRaidSetSchedule,
  createRaidSetFromTemplate,
  deleteRaidSet,
  getRaidSetTimeRecommendations,
  listRaidSetsForWeek,
} from "@/server/raid-sets";
import { listRaidTemplates } from "@/server/raid-templates";

function revalidateSetSurfaces() {
  revalidatePath("/sets");
  revalidatePath("/weekly");
  revalidatePath("/signup");
}

export default async function SetsPage() {
  const now = new Date();
  const member = await requireCurrentMember({ loginRedirectPath: "/sets" });
  const weekStartDate = getLostArkWeekStartDate(now);
  const [
    templates,
    raidSets,
    members,
    canManageRaidSets,
    canConfirmRaidSchedules,
  ] = await Promise.all([
    listRaidTemplates(member.groupId),
    listRaidSetsForWeek(member.groupId, weekStartDate),
    listMembers(member.groupId),
    canManageSets(member.id),
    canConfirmSchedules(member.id),
  ]);
  const weekDates = buildLostArkWeekDays(now).map((day) => day.date);
  const raidSetsWithRecommendations = await Promise.all(
    raidSets.map(async (raidSet) => ({
      ...raidSet,
      timeRecommendations: await getRaidSetTimeRecommendations({
        dates: weekDates,
        hours: availabilityHours,
        limit: 3,
        now,
        raidSetId: raidSet.id,
      }),
    })),
  );
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

  async function confirmSetSchedule(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await confirmRaidSetSchedule({
      actorMemberId: current.id,
      raidSetId: String(formData.get("raidSetId") ?? ""),
      startsAt: String(formData.get("startsAt") ?? ""),
    });
    revalidateSetSurfaces();
    revalidatePath("/schedules");
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
        canConfirmSchedules={canConfirmRaidSchedules}
        canManageSets={canManageRaidSets}
        clearSlotAction={clearSetSlot}
        confirmScheduleAction={confirmSetSchedule}
        createSetAction={createSet}
        deleteSetAction={deleteSet}
        markAbsentAction={markSetSlotAbsent}
        raidSets={raidSetsWithRecommendations}
        templates={templates}
        weekStartDate={weekStartDate}
      />
    </main>
  );
}
