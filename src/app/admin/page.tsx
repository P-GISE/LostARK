import { revalidatePath } from "next/cache";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MetricCard, PageHeader, SectionPanel, pageShellClassName } from "@/components/ui";
import {
  deleteAdminGroup,
  deleteAdminSchedule,
  deleteAdminUser,
  getAdminOverview,
  isAdminEmail,
  requireAdminUser,
} from "@/server/admin";

const cleanupButtonClassName =
  "inline-flex h-8 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function joinOrDash(values: string[]) {
  return values.length > 0 ? values.join(", ") : "-";
}

export default async function AdminPage() {
  const admin = await requireAdminUser();
  const overview = await getAdminOverview();

  async function removeGroup(formData: FormData) {
    "use server";
    await deleteAdminGroup({
      groupId: String(formData.get("groupId") ?? ""),
    });
    revalidatePath("/admin");
  }

  async function removeUser(formData: FormData) {
    "use server";
    await deleteAdminUser({
      userId: String(formData.get("userId") ?? ""),
    });
    revalidatePath("/admin");
  }

  async function removeSchedule(formData: FormData) {
    "use server";
    await deleteAdminSchedule({
      scheduleId: String(formData.get("scheduleId") ?? ""),
    });
    revalidatePath("/admin");
  }

  return (
    <main className={pageShellClassName}>
      <PageHeader
        eyebrow={admin.email}
        title="Admin"
        description="전체 공대, 로그인 유저, 일정 상태를 운영자 기준으로 확인합니다."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard label="전체 유저" value={overview.metrics.totalUsers} />
        <MetricCard label="전체 공대" value={overview.metrics.totalGroups} />
        <MetricCard label="전체 공대원" value={overview.metrics.totalMembers} />
        <MetricCard label="전체 일정" value={overview.metrics.totalSchedules} />
        <MetricCard label="예정 일정" value={overview.metrics.upcomingSchedules} />
        <MetricCard label="실패 알림" value={overview.metrics.failedNotifications} />
      </div>

      <div className="mt-6 grid gap-6">
        <SectionPanel title="공대 목록" description="최근 수정된 공대 50개">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-2 pr-3">공대</th>
                  <th className="px-3 py-2">리더</th>
                  <th className="px-3 py-2 text-right">공대원</th>
                  <th className="px-3 py-2 text-right">일정</th>
                  <th className="px-3 py-2">초대</th>
                  <th className="px-3 py-2">수정일</th>
                  <th className="py-2 pl-3 text-right">정리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.groups.map((group) => (
                  <tr key={group.id}>
                    <td className="py-2 pr-3 font-medium text-slate-950">{group.name}</td>
                    <td className="px-3 py-2 text-slate-600">{joinOrDash(group.leaderNames)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{group.memberCount}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{group.scheduleCount}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {group.inviteEnabled ? "활성" : "비활성"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(group.updatedAt)}</td>
                    <td className="py-2 pl-3 text-right">
                      <form action={removeGroup}>
                        <input name="groupId" type="hidden" value={group.id} />
                        <ConfirmSubmitButton
                          className={cleanupButtonClassName}
                          message={`공대 "${group.name}" 및 연결된 일정/공대원 데이터를 삭제할까요?`}
                        >
                          공대 삭제
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <SectionPanel title="로그인 유저" description="최근 가입한 유저 50명">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-2 pr-3">이름</th>
                  <th className="px-3 py-2">이메일</th>
                  <th className="px-3 py-2 text-right">소속 수</th>
                  <th className="px-3 py-2">소속 공대</th>
                  <th className="px-3 py-2">가입일</th>
                  <th className="py-2 pl-3 text-right">정리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-2 pr-3 font-medium text-slate-950">{user.displayName}</td>
                    <td className="px-3 py-2 text-slate-600">{user.email}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {user.membershipCount}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{joinOrDash(user.groupNames)}</td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="py-2 pl-3 text-right">
                      <form action={removeUser}>
                        <input name="userId" type="hidden" value={user.id} />
                        <ConfirmSubmitButton
                          className={cleanupButtonClassName}
                          disabled={isAdminEmail(user.email)}
                          message={`로그인 유저 "${user.email}" 계정을 삭제할까요? 연결된 공대원 기록, 참석 체크, 가능 시간, 캐릭터, 생성한 일정도 삭제됩니다.`}
                        >
                          유저 삭제
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <SectionPanel title="최근 일정" description="최근 시작일 기준 일정 20개">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-2 pr-3">일정</th>
                  <th className="px-3 py-2">공대</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">시작</th>
                  <th className="py-2 pl-3 text-right">정리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="py-2 pr-3 font-medium text-slate-950">{schedule.title}</td>
                    <td className="px-3 py-2 text-slate-600">{schedule.groupName}</td>
                    <td className="px-3 py-2 text-slate-600">{schedule.status}</td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(schedule.startsAt)}</td>
                    <td className="py-2 pl-3 text-right">
                      <form action={removeSchedule}>
                        <input name="scheduleId" type="hidden" value={schedule.id} />
                        <ConfirmSubmitButton
                          className={cleanupButtonClassName}
                          message={`일정 "${schedule.title}"을 삭제할까요?`}
                        >
                          일정 삭제
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      </div>
    </main>
  );
}
