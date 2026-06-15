import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ActivityLogSection } from "@/components/group-settings/activity-log-section";
import { BasicSettingsSection } from "@/components/group-settings/basic-settings-section";
import { PermissionsSection } from "@/components/group-settings/permissions-section";
import {
  EmptyState,
  PageHeader,
  pageShellClassName,
} from "@/components/ui";
import { buildInviteUrl, getShareBaseUrl } from "@/lib/app-url";
import { requireCurrentMember } from "@/server/auth-context";
import { listGroupActivityLogs } from "@/server/activity-log";
import {
  getGroupOperationalSettings,
  updateGroupOperationalSettings,
} from "@/server/group-settings";
import {
  GroupPermissionError,
  listGroupPermissionMembers,
  requireCanManageSettings,
  updateMemberPermissions,
} from "@/server/group-permissions";
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

function numberFromFormData(formData: FormData, key: string) {
  return Number(String(formData.get(key) ?? ""));
}

async function updateSettings(formData: FormData) {
  "use server";
  const current = await requireCurrentMember();
  await updateGroupSettings({
    actorMemberId: current.id,
    groupId: current.groupId,
    inviteEnabled: formData.get("inviteEnabled") === "on",
    name: String(formData.get("name") ?? ""),
  });
  await updateGroupOperationalSettings({
    actorMemberId: current.id,
    availabilityChangeNoticeEnabled:
      formData.get("availabilityChangeNoticeEnabled") === "on",
    dailyDiscordSummaryEnabled:
      formData.get("dailyDiscordSummaryEnabled") === "on",
    dailyDiscordSummaryTime: String(
      formData.get("dailyDiscordSummaryTime") ?? "",
    ),
    discordChannelId: String(formData.get("discordChannelId") ?? ""),
    groupId: current.groupId,
    raidReminderLeadMinutes: numberFromFormData(
      formData,
      "raidReminderLeadMinutes",
    ),
    timetableEndHour: numberFromFormData(formData, "timetableEndHour"),
    timetableStartHour: numberFromFormData(formData, "timetableStartHour"),
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

async function updatePermissions(formData: FormData) {
  "use server";
  const current = await requireCurrentMember();
  await updateMemberPermissions({
    actorMemberId: current.id,
    memberId: String(formData.get("memberId") ?? ""),
    permissions: {
      canConfirmSchedules: formData.get("canConfirmSchedules") === "on",
      canEditSchedules: formData.get("canEditSchedules") === "on",
      canManageHomeworkForOthers:
        formData.get("canManageHomeworkForOthers") === "on",
      canManageSets: formData.get("canManageSets") === "on",
      canManageSettings: formData.get("canManageSettings") === "on",
    },
  });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const member = await requireCurrentMember({ loginRedirectPath: "/settings" });

  try {
    await requireCanManageSettings(member.id);
  } catch (error) {
    if (!(error instanceof GroupPermissionError)) {
      throw error;
    }
    return (
      <main className={pageShellClassName}>
        <PageHeader title="공대 설정" />
        <div className="mt-6">
          <EmptyState title="공대 설정 권한이 필요합니다." />
        </div>
      </main>
    );
  }

  const inviteUrl = buildInviteUrl({
    baseUrl: await getSettingsBaseUrl(),
    inviteCode: member.group.inviteCode,
  });
  const settings = await getGroupOperationalSettings(member.groupId);
  const permissionMembers = await listGroupPermissionMembers(member.groupId);
  const activityLogs = await listGroupActivityLogs(member.groupId);

  return (
    <main className={pageShellClassName}>
      <PageHeader
        description="공대 운영 시간, 초대 링크, 멤버 권한, 최근 변경 기록을 관리합니다."
        title="공대 설정"
      />
      <BasicSettingsSection
        groupName={member.group.name}
        inviteEnabled={member.group.inviteEnabled}
        inviteUrl={inviteUrl}
        rotateInviteAction={rotateInvite}
        settings={settings}
        updateSettingsAction={updateSettings}
      />
      <PermissionsSection
        members={permissionMembers}
        updatePermissionsAction={updatePermissions}
      />
      <ActivityLogSection logs={activityLogs} />
    </main>
  );
}
