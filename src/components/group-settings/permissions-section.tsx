import { SectionPanel, primaryButtonClassName } from "@/components/ui";

type MemberPermissionView = {
  readonly canManageSets?: boolean;
  readonly canConfirmSchedules?: boolean;
  readonly canEditSchedules?: boolean;
  readonly canManageHomeworkForOthers?: boolean;
  readonly canManageSettings?: boolean;
};

type PermissionMemberView = {
  readonly id: string;
  readonly nickname: string;
  readonly role: "LEADER" | "MEMBER";
  readonly permissions: MemberPermissionView | null;
};

const permissionOptions = [
  { key: "canManageSets", label: "공대 편성" },
  { key: "canConfirmSchedules", label: "일정 확정" },
  { key: "canEditSchedules", label: "일정 편집" },
  { key: "canManageHomeworkForOthers", label: "숙제 대리 체크" },
  { key: "canManageSettings", label: "설정 관리" },
] as const;

export function PermissionsSection({
  members,
  updatePermissionsAction,
}: {
  readonly members: readonly PermissionMemberView[];
  readonly updatePermissionsAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <SectionPanel className="mt-6" title="멤버 권한">
      <div className="grid gap-3">
        {members.map((member) => (
          <form
            action={updatePermissionsAction}
            className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[minmax(0,12rem)_1fr_auto] lg:items-center"
            key={member.id}
          >
            <input name="memberId" type="hidden" value={member.id} />
            <div>
              <div className="font-semibold text-slate-950">{member.nickname}</div>
              <div className="text-xs text-slate-500">
                {member.role === "LEADER" ? "공대장" : "공대원"}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {permissionOptions.map((option) => (
                <label
                  className="flex items-center gap-2 text-sm text-slate-700"
                  key={option.key}
                >
                  <input
                    className="h-4 w-4 accent-teal-700"
                    defaultChecked={
                      member.role === "LEADER" ||
                      member.permissions?.[option.key] === true
                    }
                    disabled={member.role === "LEADER"}
                    name={option.key}
                    type="checkbox"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <button
              className={primaryButtonClassName}
              disabled={member.role === "LEADER"}
            >
              저장
            </button>
          </form>
        ))}
      </div>
    </SectionPanel>
  );
}
