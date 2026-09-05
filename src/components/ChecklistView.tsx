"use client";

import { useState } from "react";

export type ChecklistItem = {
  id: string;
  label: string;
  note?: string;
  links?: { label: string; url: string }[];
  notRequired?: boolean;
  children?: ChecklistItem[];
};

export type ChecklistSection = { id: string; title: string; items: ChecklistItem[] };

function loadChecked(storageKey: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function leafIds(items: ChecklistItem[]): string[] {
  return items.flatMap((item) => {
    if (item.children) return leafIds(item.children);
    if (item.notRequired) return [];
    return [item.id];
  });
}

export default function ChecklistView({
  title,
  description,
  storageKey,
  sections,
}: {
  title: string;
  description: string;
  storageKey: string;
  sections: ChecklistSection[];
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecked(storageKey));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore storage failures (e.g. private browsing)
      }
      return next;
    });
  }

  function resetAll() {
    setChecked({});
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore storage failures
    }
  }

  function renderItem(item: ChecklistItem) {
    if (item.children) {
      return (
        <div key={item.id} className="mt-3 first:mt-0">
          <p className="text-sm font-medium text-gray-900">{item.label}</p>
          <div className="mt-1 space-y-1 border-l-2 border-gray-100 pl-3">{item.children.map(renderItem)}</div>
        </div>
      );
    }

    const isChecked = !!checked[item.id];

    return (
      <div key={item.id} className="py-1">
        <div className="flex items-start gap-2 text-sm">
          {item.notRequired ? (
            <span className="mt-0.5 h-4 w-4 flex-none" />
          ) : (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggle(item.id)}
              className="mt-0.5 h-4 w-4 flex-none rounded border-gray-300 text-red-700 focus:ring-red-600"
            />
          )}
          <span
            onClick={() => !item.notRequired && toggle(item.id)}
            className={`select-none ${
              item.notRequired
                ? "text-gray-400 line-through"
                : isChecked
                  ? "cursor-pointer text-gray-400 line-through"
                  : "cursor-pointer text-gray-900"
            }`}
          >
            {item.label}
            {item.notRequired && <span className="ml-1 text-xs">(not required)</span>}
          </span>
        </div>
        {item.note && <p className="ml-6 text-xs text-gray-400">{item.note}</p>}
        {item.links && (
          <div className="ml-6 mt-0.5 flex flex-wrap gap-3">
            {item.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-700 hover:underline"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 print:max-w-none">
      <div className="flex items-start justify-between gap-3 border-l-4 border-red-700 pl-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex flex-none items-center gap-3 print:hidden">
          <button type="button" onClick={resetAll} className="text-xs text-gray-400 hover:text-red-700">
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              document.title = title;
              window.print();
            }}
            className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Download PDF
          </button>
        </div>
      </div>

      {sections.map((section) => {
        const ids = leafIds(section.items);
        const done = ids.filter((id) => checked[id]).length;
        return (
          <div key={section.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">{section.title}</h2>
              <span className="text-xs text-gray-400">
                {done} / {ids.length} collected
              </span>
            </div>
            <div className="mt-2 divide-y divide-gray-50">{section.items.map(renderItem)}</div>
          </div>
        );
      })}
    </div>
  );
}
