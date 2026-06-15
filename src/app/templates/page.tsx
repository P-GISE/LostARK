import { revalidatePath } from "next/cache";
import { TemplateForm } from "@/components/template-form";
import {
  Badge,
  EmptyState,
  PageHeader,
  SectionPanel,
  balancedPanelGridClassName,
  cx,
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

type RaidTemplateListItem = Awaited<ReturnType<typeof listRaidTemplates>>[number];

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

const compactDangerButtonClassName =
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50";

function groupTemplatesByName(templates: RaidTemplateListItem[]) {
  const groups = new Map<string, RaidTemplateListItem[]>();

  for (const template of templates) {
    const group = groups.get(template.name);
    if (group) {
      group.push(template);
    } else {
      groups.set(template.name, [template]);
    }
  }

  return Array.from(groups, ([name, groupTemplates]) => ({
    name,
    templates: groupTemplates,
  }));
}

export default async function TemplatesPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/templates" });
  const templates = (await listRaidTemplates(member.groupId)).sort(
    compareRaidTemplateDisplay,
  );
  const templateGroups = groupTemplatesByName(templates);

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
        <div className={cx("mt-5", balancedPanelGridClassName)}>
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
                <div className="rounded-md border border-slate-200/80 bg-slate-50/80 p-3">
                  <div className="font-semibold text-slate-950">4인 레이드</div>
                  <div className="mt-1">딜러 3 / 서폿 1</div>
                </div>
                <div className="rounded-md border border-slate-200/80 bg-slate-50/80 p-3">
                  <div className="font-semibold text-slate-950">8인 레이드</div>
                  <div className="mt-1">딜러 6 / 서폿 2</div>
                </div>
                <div className="rounded-md border border-slate-200/80 bg-slate-50/80 p-3">
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
                {templateGroups.map((group) => (
                  <details
                    aria-label={`${group.name} 템플릿 ${group.templates.length}개`}
                    className="group py-3 first:pt-0 last:pb-0"
                    key={group.name}
                    open
                  >
                    <summary className="cursor-pointer py-1 marker:text-slate-400">
                      <div className="inline-flex w-[calc(100%-1.5rem)] flex-wrap items-center justify-between gap-3 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">
                            {group.name}
                          </span>
                          <Badge tone="info">{group.templates.length}개</Badge>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-2 border-l border-slate-200 pl-3 sm:pl-4">
                      <div className="divide-y divide-slate-100">
                        {group.templates.map((template) => (
                          <div
                            aria-label={formatRaidTemplateLabel(template)}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                            key={template.id}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {splitRaidTemplateDifficulty(
                                  template.difficulty,
                                ).map((label) => (
                                  <Badge key={label} tone={difficultyTone(label)}>
                                    {label}
                                  </Badge>
                                ))}
                                <Badge>
                                  {formatRaidTemplateGates(template.gates)}
                                </Badge>
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                {template.slots.length}자리
                              </div>
                            </div>
                            <form action={removeTemplate}>
                              <input
                                name="templateId"
                                type="hidden"
                                value={template.id}
                              />
                              <button className={compactDangerButtonClassName}>
                                삭제
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState title="공대장만 템플릿을 만들거나 삭제할 수 있습니다." />
        </div>
      )}
    </main>
  );
}
