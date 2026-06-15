import { Badge, EmptyState, SectionPanel } from "@/components/ui";

type HomeworkRaidView = {
  readonly raidTemplateId: string;
  readonly raidTemplateName: string;
  readonly difficulty: string;
  readonly gates: string;
  readonly completed: boolean;
};

type HomeworkCharacterView = {
  readonly id: string;
  readonly name: string;
  readonly raids: readonly HomeworkRaidView[];
};

type HomeworkMemberView = {
  readonly id: string;
  readonly nickname: string;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly characters: readonly HomeworkCharacterView[];
};

export type HomeworkStatusView = {
  readonly weekStartDate: string;
  readonly members: readonly HomeworkMemberView[];
};

export function HomeworkBoard({
  setHomeworkAction,
  status,
}: {
  readonly setHomeworkAction?: (formData: FormData) => Promise<void>;
  readonly status: HomeworkStatusView;
}) {
  return (
    <div className="mt-6 grid gap-4">
      {status.members.length === 0 ? (
        <EmptyState title="아직 공대원이 없습니다." />
      ) : (
        status.members.map((member) => (
          <SectionPanel
            key={member.id}
            title={member.nickname}
          >
            <div className="mb-3">
              <Badge tone={member.completedCount === member.totalCount ? "success" : "warning"}>
                {member.completedCount}/{member.totalCount} 완료
              </Badge>
            </div>
            {member.characters.length === 0 ? (
              <EmptyState title="등록된 캐릭터가 없습니다." />
            ) : (
              <div className="grid gap-3">
                {member.characters.map((character) => (
                  <article
                    className="rounded-md border border-slate-200 p-3"
                    key={character.id}
                  >
                    <h3 className="font-semibold text-slate-950">
                      {character.name}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {character.raids.map((raid) => (
                        <form action={setHomeworkAction} key={raid.raidTemplateId}>
                          <input
                            name="characterId"
                            type="hidden"
                            value={character.id}
                          />
                          <input
                            name="raidTemplateId"
                            type="hidden"
                            value={raid.raidTemplateId}
                          />
                          <input
                            name="completed"
                            type="hidden"
                            value={raid.completed ? "false" : "true"}
                          />
                          <button
                            className={
                              raid.completed
                                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                                : "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                            }
                          >
                            {raid.raidTemplateName} · {raid.difficulty}{" "}
                            {raid.completed ? "완료 해제" : "완료 처리"}
                          </button>
                        </form>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionPanel>
        ))
      )}
    </div>
  );
}
