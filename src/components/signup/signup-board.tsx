import {
  Badge,
  EmptyState,
  SectionPanel,
  secondaryButtonClassName,
} from "@/components/ui";

type SignupEntryView = {
  readonly id: string;
  readonly status: string;
  readonly member: { readonly nickname: string };
  readonly character: {
    readonly name: string;
    readonly className: string;
  };
};

type SignupView = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly template: {
    readonly name: string;
    readonly difficulty: string;
    readonly gates: string;
  };
  readonly entries: readonly SignupEntryView[];
};

function statusTone(status: string) {
  if (status === "FINALIZED") {
    return "success";
  }
  if (status === "CANCELED" || status === "FAILED") {
    return "danger";
  }
  if (status === "ASSIGNING" || status === "ASSIGNED") {
    return "info";
  }
  return "warning";
}

export function SignupBoard({
  assignAction,
  cancelAction,
  finalizeAction,
  signups,
}: {
  readonly assignAction?: (formData: FormData) => Promise<void>;
  readonly cancelAction?: (formData: FormData) => Promise<void>;
  readonly finalizeAction?: (formData: FormData) => Promise<void>;
  readonly signups: readonly SignupView[];
}) {
  return (
    <div className="mt-6 grid gap-4">
      {signups.length === 0 ? (
        <EmptyState title="열려 있는 수강 신청이 없습니다." />
      ) : (
        signups.map((signup) => (
          <SectionPanel key={signup.id} title={signup.title}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(signup.status)}>{signup.status}</Badge>
              <span className="text-sm text-slate-500">
                {signup.template.name} · {signup.template.difficulty} ·{" "}
                {signup.template.gates}관문
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {signup.entries.length === 0 ? (
                <EmptyState title="아직 신청자가 없습니다." />
              ) : (
                signup.entries.map((entry) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3"
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
                    <Badge tone={statusTone(entry.status)}>{entry.status}</Badge>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={assignAction}>
                <input name="signupId" type="hidden" value={signup.id} />
                <button className={secondaryButtonClassName}>배정</button>
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
          </SectionPanel>
        ))
      )}
    </div>
  );
}
