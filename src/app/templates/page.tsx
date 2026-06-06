import { revalidatePath } from "next/cache";
import { TemplateForm } from "@/components/template-form";
import {
  Badge,
  EmptyState,
  PageHeader,
  SectionPanel,
  dangerButtonClassName,
  pageShellClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import {
  compareRaidTemplateDisplay,
  formatRaidTemplateGates,
  formatRaidTemplateLabel,
  splitRaidTemplateDifficulty,
} from "@/lib/raid-template-display";
import { requireCurrentMember } from "@/server/auth-context";
import {
  createRaidTemplateForLeader,
  deleteRaidTemplate,
  importDefaultRaidTemplatesForLeader,
  listRaidTemplates,
} from "@/server/raid-templates";

function toCount(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) ?? 0));
}

function buildSlots(dpsSlots: number, supportSlots: number) {
  return [
    ...Array.from({ length: dpsSlots }, (_, index) => ({
      label: `딜러 ${index + 1}`,
      role: "DPS" as const,
      required: true,
      classPreference: "",
      notes: "",
    })),
    ...Array.from({ length: supportSlots }, (_, index) => ({
      label: `서폿 ${index + 1}`,
      role: "SUPPORT" as const,
      required: true,
      classPreference: "",
      notes: "",
    })),
  ];
}

function difficultyTone(label: string) {
  if (label === "익스트림" || label === "나이트메어") {
    return "danger" as const;
  }
  if (label === "하드") {
    return "warning" as const;
  }
  if (label === "노말") {
    return "success" as const;
  }
  return "neutral" as const;
}

export default async function TemplatesPage() {
  const member = await requireCurrentMember();
  const templates = (await listRaidTemplates(member.groupId)).sort(
    compareRaidTemplateDisplay,
  );

  async function createTemplate(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    const dpsSlots = toCount(formData, "dpsSlots");
    const supportSlots = toCount(formData, "supportSlots");

    await createRaidTemplateForLeader({
      actorMemberId: current.id,
      groupId: current.groupId,
      name: String(formData.get("name") ?? ""),
      difficulty: String(formData.get("difficulty") ?? ""),
      gates: String(formData.get("gates") ?? ""),
      requiredPlayers: Number(formData.get("requiredPlayers") ?? 0),
      requirements: String(formData.get("requirements") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      slots: buildSlots(dpsSlots, supportSlots),
    });
    revalidatePath("/templates");
  }

  async function removeTemplate(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await deleteRaidTemplate({
      actorMemberId: current.id,
      templateId: String(formData.get("templateId") ?? ""),
    });
    revalidatePath("/templates");
  }

  async function importDefaultTemplates() {
    "use server";
    const current = await requireCurrentMember();
    await importDefaultRaidTemplatesForLeader({
      actorMemberId: current.id,
      groupId: current.groupId,
    });
    revalidatePath("/templates");
    revalidatePath("/schedules");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="반복해서 쓰는 레이드 자리 구성을 만들어 일정 생성 시간을 줄입니다."
        eyebrow="레이드 운영"
        title="레이드 템플릿"
      />
      {member.role === "LEADER" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
          <div className="grid content-start gap-4">
            <SectionPanel
              action={
                <form action={importDefaultTemplates}>
                  <button className={secondaryButtonClassName}>
                    기본 템플릿 가져오기
                  </button>
                </form>
              }
              description="지평의 성당, 세르카, 카제로스 서막부터 종막, 베히모스, 카멘, 상아탑, 카양겔 기본 구성을 중복 없이 추가합니다."
              title="로아 기본 템플릿"
            >
              <div className="grid gap-3 text-sm text-slate-600">
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="font-semibold text-slate-950">4인 레이드</div>
                  <div className="mt-1">딜러 3 / 서폿 1</div>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="font-semibold text-slate-950">8인 레이드</div>
                  <div className="mt-1">딜러 6 / 서폿 2</div>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="font-semibold text-slate-950">16인 레이드</div>
                  <div className="mt-1">딜러 12 / 서폿 4</div>
                </div>
              </div>
            </SectionPanel>
            <SectionPanel title="새 템플릿">
              <TemplateForm action={createTemplate} />
            </SectionPanel>
          </div>
          <SectionPanel title="템플릿 목록">
            {templates.length === 0 ? (
              <EmptyState title="아직 등록된 템플릿이 없습니다." />
            ) : (
              <div className="divide-y divide-slate-100">
                {templates.map((template) => (
                  <div
                    aria-label={formatRaidTemplateLabel(template)}
                    className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
                    key={template.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">
                          {template.name}
                        </span>
                        {splitRaidTemplateDifficulty(template.difficulty).map(
                          (label) => (
                            <Badge key={label} tone={difficultyTone(label)}>
                              {label}
                            </Badge>
                          ),
                        )}
                        <Badge>{formatRaidTemplateGates(template.gates)}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {template.slots.length}자리
                      </div>
                    </div>
                    <form action={removeTemplate}>
                      <input name="templateId" type="hidden" value={template.id} />
                      <button className={dangerButtonClassName}>삭제</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState title="공대장만 템플릿을 만들거나 삭제할 수 있습니다." />
        </div>
      )}
    </main>
  );
}
