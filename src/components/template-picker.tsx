"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  cx,
  inputClassName,
} from "@/components/ui";
import {
  formatRaidTemplateLabel,
  type RaidTemplateDisplayInput,
} from "@/lib/raid-template-display";

export type TemplatePickerTemplate = RaidTemplateDisplayInput & {
  id: string;
};

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function groupTemplatesByName(templates: TemplatePickerTemplate[]) {
  const groups = new Map<string, TemplatePickerTemplate[]>();

  for (const template of templates) {
    const key = template.name.trim() || "이름 미정";
    const group = groups.get(key);
    if (group) {
      group.push(template);
    } else {
      groups.set(key, [template]);
    }
  }

  return Array.from(groups, ([name, groupTemplates]) => ({
    name,
    templates: groupTemplates,
  }));
}

export function TemplatePicker({
  defaultTemplateId,
  templates,
}: {
  defaultTemplateId?: string;
  templates: TemplatePickerTemplate[];
}) {
  const initialTemplateId =
    templates.find((template) => template.id === defaultTemplateId)?.id ??
    templates[0]?.id ??
    "";
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState(initialTemplateId);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => new Set());
  const normalizedQuery = normalizeSearch(query);
  const groups = useMemo(() => groupTemplatesByName(templates), [templates]);
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      templates: group.templates.filter((template) => {
        if (!normalizedQuery) {
          return true;
        }
        return normalizeSearch(formatRaidTemplateLabel(template)).includes(
          normalizedQuery,
        );
      }),
    }))
    .filter((group) => group.templates.length > 0);

  function toggleGroup(groupName: string, open: boolean) {
    setClosedGroups((current) => {
      const next = new Set(current);
      if (open) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }

  return (
    <div className="grid min-w-0 gap-2">
      <input
        name="templateId"
        readOnly
        type="hidden"
        value={selectedTemplateId}
      />
      <input
        aria-label="템플릿 검색"
        className={inputClassName}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="템플릿 검색"
        type="search"
        value={query}
      />
      {selectedTemplate ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">선택</span>
          <span className="min-w-0 truncate">
            {formatRaidTemplateLabel(selectedTemplate)}
          </span>
        </div>
      ) : null}
      <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200/90 bg-white shadow-sm shadow-slate-200/60">
        {visibleGroups.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">
            검색 결과가 없습니다.
          </div>
        ) : (
          visibleGroups.map((group) => {
            const selectedInGroup = group.templates.some(
              (template) => template.id === selectedTemplateId,
            );
            const open = normalizedQuery
              ? true
              : selectedInGroup || !closedGroups.has(group.name);

            return (
              <details
                aria-label={`${group.name} 템플릿 ${group.templates.length}개`}
                className="border-b border-slate-100 last:border-b-0"
                key={group.name}
                onToggle={(event) => {
                  if (!normalizedQuery) {
                    toggleGroup(group.name, event.currentTarget.open);
                  }
                }}
                open={open}
              >
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-900 marker:text-slate-400">
                  <span className="inline-flex w-[calc(100%-1.25rem)] items-center justify-between gap-2 align-middle">
                    <span className="min-w-0 truncate">{group.name}</span>
                    <Badge tone="info">{group.templates.length}개</Badge>
                  </span>
                </summary>
                <div className="grid gap-1 px-2 pb-2">
                  {group.templates.map((template) => {
                    const selected = template.id === selectedTemplateId;
                    const label = formatRaidTemplateLabel(template);

                    return (
                      <button
                        aria-label={`${label} ${selected ? "선택됨" : "선택"}`}
                        aria-pressed={selected}
                        className={cx(
                          "flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-medium transition",
                          selected
                            ? "border-teal-200 bg-teal-50 text-teal-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900",
                        )}
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        type="button"
                      >
                        <span className="min-w-0 truncate">{label}</span>
                        <span className="shrink-0 text-[11px] font-semibold">
                          {selected ? "선택됨" : "선택"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
