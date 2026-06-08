import type { ReactNode } from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const contentShellClassName = "mx-auto w-full max-w-7xl px-4 sm:px-6";

export const pageShellClassName = `${contentShellClassName} py-5 lg:py-7`;

export const narrowPageShellClassName =
  `${contentShellClassName} flex min-h-[calc(100vh-72px)] flex-col justify-center py-5 lg:py-7`;

export const narrowContentClassName = "mx-auto w-full max-w-md";

export const narrowWideContentClassName = "mx-auto w-full max-w-lg";

export const inputClassName =
  "h-10 min-w-0 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100";

export const textareaClassName =
  "min-h-24 min-w-0 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export const selectClassName =
  "h-10 min-w-0 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100";

export const primaryButtonClassName =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 disabled:bg-slate-300";

export const secondaryButtonClassName =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-100";

export const dangerButtonClassName =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50";

export const mutedButtonClassName =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200";

export function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-2 text-xs font-semibold text-teal-700">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function SectionPanel({
  action,
  children,
  className,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}) {
  return (
    <section
      className={cx(
        "min-w-0 rounded-lg border border-slate-200/90 bg-white shadow-sm shadow-slate-200/70",
        className,
      )}
    >
      {title || description || action ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {detail ? <div className="mt-1 text-sm text-slate-500">{detail}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <span
      className={cx(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
