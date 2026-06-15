import { revalidatePath } from "next/cache";
import { SignupBoard } from "@/components/signup/signup-board";
import {
  PageHeader,
  SectionPanel,
  inputClassName,
  pageShellClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/ui";
import { getLostArkWeekStartDate } from "@/lib/lostark-week";
import {
  compareRaidTemplateDisplay,
  formatRaidTemplateLabel,
} from "@/lib/raid-template-display";
import { requireCurrentMember } from "@/server/auth-context";
import { listCharactersForMember } from "@/server/characters";
import { canManageSets } from "@/server/group-permissions";
import { listRaidTemplates } from "@/server/raid-templates";
import {
  applyToRaidSignup,
  assignRaidSignup,
  cancelRaidSignupEntry,
  cancelRaidSignup,
  createRaidSignup,
  finalizeRaidSignup,
  listRaidSignups,
} from "@/server/signups";

export default async function SignupPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/signup" });
  const weekStartDate = getLostArkWeekStartDate();
  const [templates, signups, characters, canManageRaidSignups] = await Promise.all([
    listRaidTemplates(member.groupId),
    listRaidSignups(member.groupId, weekStartDate),
    listCharactersForMember(member.id),
    canManageSets(member.id),
  ]);
  const sortedTemplates = [...templates].sort(compareRaidTemplateDisplay);

  async function applySignup(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await applyToRaidSignup({
      characterId: String(formData.get("characterId") ?? ""),
      memberId: current.id,
      memo: String(formData.get("memo") ?? ""),
      signupId: String(formData.get("signupId") ?? ""),
    });
    revalidatePath("/signup");
  }

  async function cancelSignupEntry(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await cancelRaidSignupEntry({
      entryId: String(formData.get("entryId") ?? ""),
      memberId: current.id,
    });
    revalidatePath("/signup");
  }

  async function createSignup(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await createRaidSignup({
      actorMemberId: current.id,
      maxParties: Number(formData.get("maxParties") ?? 1),
      partySize: Number(formData.get("partySize") ?? 1),
      templateId: String(formData.get("templateId") ?? ""),
      title: String(formData.get("title") ?? ""),
      weekStartDate,
    });
    revalidatePath("/signup");
  }

  async function assignSignup(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await assignRaidSignup({
      actorMemberId: current.id,
      signupId: String(formData.get("signupId") ?? ""),
    });
    revalidatePath("/signup");
    revalidatePath("/sets");
  }

  async function finalizeSignup(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await finalizeRaidSignup({
      actorMemberId: current.id,
      signupId: String(formData.get("signupId") ?? ""),
    });
    revalidatePath("/signup");
  }

  async function cancelSignup(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await cancelRaidSignup({
      actorMemberId: current.id,
      signupId: String(formData.get("signupId") ?? ""),
    });
    revalidatePath("/signup");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="레이드 신청을 열고 참가자를 draft 공대 편성으로 배정합니다."
        eyebrow={weekStartDate}
        title="수강 신청"
      />
      {canManageRaidSignups ? (
        <SectionPanel className="mt-5" title="신청 열기">
          <form
            action={createSignup}
            className="grid gap-3 lg:grid-cols-[minmax(16rem,1.35fr)_minmax(12rem,1fr)_8rem_8rem_auto] lg:items-end"
          >
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              레이드
              <select
                className={selectClassName}
                disabled={templates.length === 0}
                name="templateId"
                required
              >
                {sortedTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {formatRaidTemplateLabel(template)}
                  </option>
                ))}
              </select>
              </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              신청 이름
              <input
                className={inputClassName}
                name="title"
                placeholder="아칸 수강"
                required
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              파티 인원
              <input
                className={inputClassName}
                defaultValue={1}
                min={1}
                name="partySize"
                type="number"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              최대 파티
              <input
                className={inputClassName}
                defaultValue={1}
                min={1}
                name="maxParties"
                type="number"
              />
            </label>
            <button
              className={primaryButtonClassName}
              disabled={templates.length === 0}
            >
              신청 열기
            </button>
          </form>
        </SectionPanel>
      ) : null}
      <SignupBoard
        applyAction={applySignup}
        assignAction={assignSignup}
        canManageSignups={canManageRaidSignups}
        cancelEntryAction={cancelSignupEntry}
        cancelAction={cancelSignup}
        characters={characters}
        currentMemberId={member.id}
        finalizeAction={finalizeSignup}
        signups={signups}
      />
    </main>
  );
}
