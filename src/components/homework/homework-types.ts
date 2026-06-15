export type HomeworkRaidView = {
  readonly raidTemplateId: string;
  readonly raidTemplateName: string;
  readonly difficulty: string;
  readonly gates: string;
  readonly completed: boolean;
};

export type HomeworkCharacterView = {
  readonly className: string;
  readonly id: string;
  readonly itemLevel: number;
  readonly name: string;
  readonly raids: readonly HomeworkRaidView[];
};

export type HomeworkMemberView = {
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
