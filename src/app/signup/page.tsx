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
import { requireCurrentMember } from "@/server/auth-context";
import { listRaidTemplates } from "@/server/raid-templates";
import {
  assignRaidSignup,
  cancelRaidSignup,
  createRaidSignup,
  finalizeRaidSignup,
  listRaidSignups,
} from "@/server/signups";

export default async function SignupPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/signup" });
  const weekStartDate = getLostArkWeekStartDate();
  const [templates, signups] = await Promise.all([
    listRaidTemplates(member.groupId),
    listRaidSignups(member.groupId, weekStartDate),
  ]);

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
      <SectionPanel className="mt-6" title="신청 열기">
        <form action={createSignup} className="grid gap-3 lg:grid-cols-5">
          <select
            className={selectClassName}
            disabled={templates.length === 0}
            name="templateId"
            required
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.difficulty} · {template.gates}관문
              </option>
            ))}
          </select>
          <input
            className={inputClassName}
            name="title"
            placeholder="아칸 수강"
            required
          />
          <input
            className={inputClassName}
            defaultValue={1}
            min={1}
            name="partySize"
            type="number"
          />
          <input
            className={inputClassName}
            defaultValue={1}
            min={1}
            name="maxParties"
            type="number"
          />
          <button
            className={primaryButtonClassName}
            disabled={templates.length === 0}
          >
            신청 열기
          </button>
        </form>
      </SectionPanel>
      <SignupBoard
        assignAction={assignSignup}
        cancelAction={cancelSignup}
        finalizeAction={finalizeSignup}
        signups={signups}
      />
    </main>
  );
}
