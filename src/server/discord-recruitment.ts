import { formatRaidTemplateLabel } from "@/lib/raid-template-display";
import { db } from "@/server/db";

export type DiscordRecruitmentMessage = {
  readonly content?: string;
  readonly embeds: Array<{
    readonly title: string;
    readonly description: string;
    readonly color: number;
    readonly fields: Array<{
      readonly name: string;
      readonly value: string;
      readonly inline?: boolean;
    }>;
  }>;
  readonly components: Array<{
    readonly type: 1;
    readonly components: Array<{
      readonly type: 2;
      readonly custom_id: string;
      readonly label: string;
      readonly style: number;
      readonly disabled?: boolean;
    }>;
  }>;
};

const dayLabels = ["수", "목", "금", "토", "일", "월", "화"];

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function applicantValue(
  entries: Array<{
    readonly member: { readonly nickname: string };
    readonly character: { readonly name: string; readonly className: string };
    readonly status: string;
  }>,
) {
  const activeEntries = entries.filter((entry) => entry.status !== "CANCELED");
  if (activeEntries.length === 0) {
    return "아직 신청자가 없습니다.";
  }

  return activeEntries
    .map(
      (entry) =>
        `${entry.character.name} (${entry.character.className}) / ${entry.member.nickname}`,
    )
    .join("\n")
    .slice(0, 1024);
}

function actionRows(signup: {
  readonly id: string;
  readonly status: string;
  readonly weekStartDate: string;
}) {
  const disabled = signup.status !== "OPEN";
  return [
    {
      type: 1 as const,
      components: [
        {
          type: 2 as const,
          custom_id: `party:join:${signup.id}`,
          label: "신청",
          style: 3,
          disabled,
        },
        {
          type: 2 as const,
          custom_id: `party:leave:${signup.id}`,
          label: "취소",
          style: 2,
          disabled,
        },
        {
          type: 2 as const,
          custom_id: `party:close:${signup.id}`,
          label: "마감",
          style: 4,
          disabled,
        },
      ],
    },
    {
      type: 1 as const,
      components: dayLabels.slice(0, 5).map((label, index) => ({
        type: 2 as const,
        custom_id: `party:day:${signup.id}:${index}`,
        label: `${label} ${addDays(signup.weekStartDate, index).slice(5)}`,
        style: 1,
        disabled,
      })),
    },
  ];
}

export async function buildDiscordRecruitmentMessage(
  signupId: string,
): Promise<DiscordRecruitmentMessage> {
  const signup = await db.raidSignup.findUnique({
    include: {
      entries: {
        include: { character: true, member: true },
        orderBy: { createdAt: "asc" },
      },
      template: true,
    },
    where: { id: signupId },
  });
  if (!signup) {
    throw new Error("모집을 찾을 수 없습니다");
  }

  const activeEntryCount = signup.entries.filter(
    (entry) => entry.status !== "CANCELED",
  ).length;
  const capacity = signup.partySize * signup.maxParties;
  const statusText =
    signup.status === "OPEN"
      ? "신청 가능"
      : signup.status === "FINALIZED"
        ? "마감"
        : signup.status === "CANCELED"
          ? "취소"
          : "배정 중";

  return {
    embeds: [
      {
        title: signup.title,
        description: `${formatRaidTemplateLabel(signup.template)}\n주간 기준: ${signup.weekStartDate}`,
        color: signup.status === "OPEN" ? 0x0f766e : 0x64748b,
        fields: [
          {
            name: "상태",
            value: statusText,
            inline: true,
          },
          {
            name: "정원",
            value: `${activeEntryCount}/${capacity}명`,
            inline: true,
          },
          {
            name: "신청자",
            value: applicantValue(signup.entries),
          },
        ],
      },
    ],
    components: actionRows(signup),
  };
}
