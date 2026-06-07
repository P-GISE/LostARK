import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";
import {
  EmptyState,
  PageHeader,
  SectionPanel,
  inputClassName,
  pageShellClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { buildInviteUrl, getShareBaseUrl } from "@/lib/app-url";
import { requireCurrentMember } from "@/server/auth-context";
import {
  rotateGroupInviteCode,
  updateGroupSettings,
} from "@/server/groups";

function allowedRequestHosts() {
  return [process.env.APP_DOMAIN, process.env.APP_BASE_URL];
}

async function getSettingsBaseUrl() {
  const requestHeaders = await headers();

  return getShareBaseUrl({
    configuredBaseUrl: process.env.APP_BASE_URL,
    allowedRequestHosts: allowedRequestHosts(),
    requestHost:
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    requestProto: requestHeaders.get("x-forwarded-proto"),
  });
}

export default async function SettingsPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/settings" });

  if (member.role !== "LEADER") {
    return (
      <main className={pageShellClassName}>
        <PageHeader title="공대 설정" />
        <div className="mt-6">
          <EmptyState title="공대장만 설정을 변경할 수 있습니다." />
        </div>
      </main>
    );
  }

  async function updateSettings(formData: FormData) {
    "use server";
    const current = await requireCurrentMember();
    await updateGroupSettings({
      actorMemberId: current.id,
      groupId: current.groupId,
      name: String(formData.get("name") ?? ""),
      inviteEnabled: formData.get("inviteEnabled") === "on",
    });
    revalidatePath("/");
    revalidatePath("/settings");
  }

  async function rotateInvite() {
    "use server";
    const current = await requireCurrentMember();
    await rotateGroupInviteCode({
      actorMemberId: current.id,
      groupId: current.groupId,
    });
    revalidatePath("/settings");
  }

  const inviteUrl = buildInviteUrl({
    baseUrl: await getSettingsBaseUrl(),
    inviteCode: member.group.inviteCode,
  });

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="공대 이름과 초대 링크를 관리합니다."
        title="공대 설정"
      />
      <SectionPanel className="mt-6" title="기본 정보">
        <form action={updateSettings} className="mt-4 grid gap-3">
          <input
            className={inputClassName}
            defaultValue={member.group.name}
            minLength={2}
            name="name"
            required
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              defaultChecked={member.group.inviteEnabled}
              name="inviteEnabled"
              type="checkbox"
            />
            초대 링크 활성화
          </label>
          <button className={primaryButtonClassName}>
            설정 저장
          </button>
        </form>
      </SectionPanel>
      <SectionPanel
        action={<CopyInviteLinkButton value={inviteUrl} />}
        className="mt-6"
        title="초대 링크"
      >
        <p className="min-h-10 break-all rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          {inviteUrl}
        </p>
        <form action={rotateInvite} className="mt-3 flex flex-wrap gap-2">
          <a
            className={secondaryButtonClassName}
            href={inviteUrl}
            rel="noreferrer"
            target="_blank"
          >
            열기
          </a>
          <button className={secondaryButtonClassName}>
            초대 링크 재발급
          </button>
        </form>
      </SectionPanel>
    </main>
  );
}
