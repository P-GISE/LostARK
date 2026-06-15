type CockpitDay = {
  readonly date: string;
  readonly label: string;
};

const workflowLinks = [
  { href: "#my-availability", label: "내 입력" },
  { href: "#group-availability", label: "공대 현황" },
  { href: "#upcoming-schedules", label: "일정" },
] as const;

function dateRangeText(days: readonly CockpitDay[]) {
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  if (!firstDay || !lastDay) {
    return "-";
  }

  return `${firstDay.date.slice(5)} ${firstDay.label} ~ ${lastDay.date.slice(
    5,
  )} ${lastDay.label}`;
}

function MetricItem({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="availability-command__metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AvailabilityCockpitHeader({
  days,
  scheduleCount,
}: {
  readonly days: readonly CockpitDay[];
  readonly scheduleCount: number;
}) {
  return (
    <section
      aria-label="가능 시간 운영 요약"
      className="availability-command"
    >
      <div className="availability-command__title">
        <span>WEEKLY OPS</span>
        <strong>가능 시간 운영판</strong>
      </div>
      <nav
        aria-label="가능 시간 작업 흐름"
        className="availability-command__nav"
      >
        {workflowLinks.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <dl className="availability-command__metrics">
        <MetricItem label="입력 기간" value={dateRangeText(days)} />
        <MetricItem label="예정 일정" value={`${scheduleCount}개`} />
        <MetricItem label="입력 단위" value="1시간" />
      </dl>
    </section>
  );
}
