import {
  Badge,
  EmptyState,
  SectionPanel,
  balancedCardGridClassName,
  cx,
  inputClassName,
  secondaryButtonClassName,
  selectClassName,
} from "@/components/ui";
import { formatRaidTemplateLabel } from "@/lib/raid-template-display";
import type { RaidSignupEntryStatus, RaidSignupStatus } from "@prisma/client";
import {
  entryStatusText,
  entryStatusTone,
  isActiveEntry,
  signupStatusText,
  signupStatusTone,
} from "@/components/signup/signup-status";

type SignupCharacterOption = {
  readonly id: string;
  readonly name: string;
  readonly className: string;
};

type SignupEntryView = {
  readonly id: string;
  readonly status: RaidSignupEntryStatus;
  readonly member: { readonly id: string; readonly nickname: string };
  readonly character: {
    readonly name: string;
    readonly className: string;
  };
};

type SignupView = {
  readonly id: string;
  readonly title: string;
  readonly status: RaidSignupStatus;
  readonly partySize: number;
  readonly maxParties: number;
  readonly template: {
    readonly name: string;
    readonly difficulty: string;
    readonly gates: string;
  };
  readonly entries: readonly SignupEntryView[];
};

function characterLabel(character: SignupCharacterOption) {
  return `${character.name} · ${character.className}`;
}

export function SignupBoard({
  applyAction,
  assignAction,
  canManageSignups = false,
  cancelEntryAction,
  cancelAction,
  characters = [],
  currentMemberId,
  finalizeAction,
  signups,
}: {
  readonly applyAction?: (formData: FormData) => Promise<void>;
  readonly assignAction?: (formData: FormData) => Promise<void>;
  readonly canManageSignups?: boolean;
  readonly cancelEntryAction?: (formData: FormData) => Promise<void>;
  readonly cancelAction?: (formData: FormData) => Promise<void>;
  readonly characters?: readonly SignupCharacterOption[];
  readonly currentMemberId?: string;
  readonly finalizeAction?: (formData: FormData) => Promise<void>;
  readonly signups: readonly SignupView[];
}) {
  return (
    <div className={cx("mt-5", balancedCardGridClassName)}>
      {signups.length === 0 ? (
        <EmptyState title="열려 있는 수강 신청이 없습니다." />
      ) : (
        signups.map((signup) => {
          const activeEntryCount = signup.entries.filter((entry) =>
            isActiveEntry(entry.status),
          ).length;
          const appliedEntryCount = signup.entries.filter(
            (entry) => entry.status === "APPLIED",
          ).length;
          const capacity = signup.partySize * signup.maxParties;
          const canApply = signup.status === "OPEN" && characters.length > 0;
          const canAssign =
            signup.status === "OPEN" && appliedEntryCount >= signup.partySize;

          return (
            <SectionPanel key={signup.id} title={signup.title}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={signupStatusTone(signup.status)}>
                  {signupStatusText(signup.status)}
                </Badge>
                <Badge tone="info">
                  {activeEntryCount}/{capacity}명
                </Badge>
                <span className="text-sm text-slate-500">
                  {formatRaidTemplateLabel(signup.template)}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {signup.entries.length === 0 ? (
                  <EmptyState title="아직 신청자가 없습니다." />
                ) : (
                  signup.entries.map((entry) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2.5"
                      key={entry.id}
                    >
                      <div>
                        <div className="font-semibold text-slate-950">
                          {entry.character.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {entry.character.className} · {entry.member.nickname}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={entryStatusTone(entry.status)}>
                          {entryStatusText(entry.status)}
                        </Badge>
                        {entry.member.id === currentMemberId &&
                        entry.status === "APPLIED" ? (
                          <form action={cancelEntryAction}>
                            <input name="entryId" type="hidden" value={entry.id} />
                            <button className={secondaryButtonClassName}>
                              신청 취소
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form
                action={applyAction}
                className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
              >
                <input name="signupId" type="hidden" value={signup.id} />
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  내 캐릭터
                  <select
                    className={selectClassName}
                    disabled={!canApply}
                    name="characterId"
                    required
                  >
                    {characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {characterLabel(character)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  메모
                  <input
                    className={inputClassName}
                    disabled={!canApply}
                    name="memo"
                    placeholder="가능 시간 또는 희망 파티"
                  />
                </label>
                <button
                  className={cx(
                    secondaryButtonClassName,
                    !canApply && "opacity-50",
                  )}
                  disabled={!canApply}
                >
                  신청
                </button>
              </form>
              {canManageSignups ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={assignAction}>
                    <input name="signupId" type="hidden" value={signup.id} />
                    <button
                      className={cx(
                        secondaryButtonClassName,
                        !canAssign && "opacity-50",
                      )}
                      disabled={!canAssign}
                    >
                      배정
                    </button>
                  </form>
                  <form action={finalizeAction}>
                    <input name="signupId" type="hidden" value={signup.id} />
                    <button className={secondaryButtonClassName}>마감</button>
                  </form>
                  <form action={cancelAction}>
                    <input name="signupId" type="hidden" value={signup.id} />
                    <button className={secondaryButtonClassName}>취소</button>
                  </form>
                </div>
              ) : null}
            </SectionPanel>
          );
        })
      )}
    </div>
  );
}
