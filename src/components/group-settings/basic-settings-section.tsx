import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";
import {
  SectionPanel,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

type OperationalSettingsView = {
  readonly timetableStartHour: number;
  readonly timetableEndHour: number;
  readonly dailyDiscordSummaryEnabled: boolean;
  readonly dailyDiscordSummaryTime: string;
  readonly raidReminderLeadMinutes: number;
  readonly availabilityChangeNoticeEnabled: boolean;
  readonly discordChannelId: string | null;
};

export function BasicSettingsSection({
  groupName,
  inviteEnabled,
  inviteUrl,
  rotateInviteAction,
  settings,
  updateSettingsAction,
}: {
  readonly groupName: string;
  readonly inviteEnabled: boolean;
  readonly inviteUrl: string;
  readonly rotateInviteAction: () => Promise<void>;
  readonly settings: OperationalSettingsView;
  readonly updateSettingsAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <>
      <SectionPanel className="mt-6" title="시간표 표시 범위">
        <form action={updateSettingsAction} className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              공대 이름
              <input
                className={inputClassName}
                defaultValue={groupName}
                minLength={2}
                name="name"
                required
              />
            </label>
            <label className="flex items-center gap-2 self-end text-sm text-slate-700">
              <input
                className="h-4 w-4 accent-teal-700"
                defaultChecked={inviteEnabled}
                name="inviteEnabled"
                type="checkbox"
              />
              초대 링크 활성화
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              시작 시간
              <input
                className={inputClassName}
                defaultValue={settings.timetableStartHour}
                max={23}
                min={0}
                name="timetableStartHour"
                required
                type="number"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              종료 시간
              <input
                className={inputClassName}
                defaultValue={settings.timetableEndHour}
                max={23}
                min={0}
                name="timetableEndHour"
                required
                type="number"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              일일 요약 시간
              <input
                className={inputClassName}
                defaultValue={settings.dailyDiscordSummaryTime}
                name="dailyDiscordSummaryTime"
                pattern="\d{2}:\d{2}"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              리마인드 분
              <input
                className={inputClassName}
                defaultValue={settings.raidReminderLeadMinutes}
                max={1440}
                min={0}
                name="raidReminderLeadMinutes"
                required
                type="number"
              />
            </label>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                className="h-4 w-4 accent-teal-700"
                defaultChecked={settings.dailyDiscordSummaryEnabled}
                name="dailyDiscordSummaryEnabled"
                type="checkbox"
              />
              디스코드 일일 요약
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                className="h-4 w-4 accent-teal-700"
                defaultChecked={settings.availabilityChangeNoticeEnabled}
                name="availabilityChangeNoticeEnabled"
                type="checkbox"
              />
              가능시간 변경 알림
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              디스코드 채널 ID
              <input
                className={inputClassName}
                defaultValue={settings.discordChannelId ?? ""}
                name="discordChannelId"
              />
            </label>
          </div>

          <button className={primaryButtonClassName}>설정 저장</button>
        </form>
      </SectionPanel>

      <SectionPanel
        action={<CopyInviteLinkButton value={inviteUrl} />}
        className="mt-6"
        title="초대 링크"
      >
        <p className="min-h-10 break-all rounded-md border border-slate-200/90 bg-slate-50/80 p-3 text-sm text-slate-700">
          {inviteUrl}
        </p>
        <form action={rotateInviteAction} className="mt-3 flex flex-wrap gap-2">
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
    </>
  );
}
