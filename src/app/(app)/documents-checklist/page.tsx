"use client";

import { useState } from "react";

type ChecklistItem = {
  id: string;
  label: string;
  note?: string;
  links?: { label: string; url: string }[];
  notRequired?: boolean;
  children?: ChecklistItem[];
};

type ChecklistSection = { id: string; title: string; items: ChecklistItem[] };

const CHECKLIST: ChecklistSection[] = [
  {
    id: "customs-clearance",
    title: "Customs Clearance (Scanned Copies)",
    items: [
      { id: "photo", label: "Photo (Passport size)" },
      { id: "specimen-signature", label: "Specimen Signature", note: "Sign on a white A4 sheet" },
      { id: "tin", label: "TIN" },
      { id: "temp-vat", label: "Temporary VAT", note: "Obtain from IRD after we get the BL" },
      { id: "nic-both-sides", label: "NIC both sides" },
      {
        id: "mobile-confirmation",
        label: "Mobile confirmation letter",
        links: [
          {
            label: "Mobitel",
            url: "https://docs.google.com/document/d/10gbwS_7ozDKGGHinCouf_vrfG_8cgxH1Tv6T31ayodI/edit?usp=sharing",
          },
          {
            label: "Dialog",
            url: "https://docs.google.com/document/d/14gIc_SHojJMAVfSniH-i4iHzTeFOLghp37zTxcWGnyA/edit?usp=sharing",
          },
        ],
      },
      {
        id: "gs1-form",
        label: "GS-I form",
        note: "Only if NIC address is different from TIN address",
        links: [{ label: "Form", url: "https://www.customs.gov.lk/wp-content/uploads/2021/06/GS_FORM_01.pdf" }],
      },
    ],
  },
  {
    id: "temporary-vat",
    title: "Temporary VAT (Scanned Copies)",
    items: [
      { id: "bl", label: "BL", note: "Exporter will provide this" },
      { id: "commercial-invoice", label: "Commercial invoice", note: "Exporter will provide this" },
      { id: "lc", label: "LC" },
      { id: "id", label: "ID" },
      {
        id: "vat-form",
        label: "Form",
        links: [{ label: "Form", url: "https://drive.google.com/file/d/1tAtXcJ0Nlqc5sh3QqyJ-7PHKobS5DAz4/view?usp=drive_link" }],
      },
      {
        id: "letter-personal-use",
        label: "Letter of personal use",
        links: [
          {
            label: "Template",
            url: "https://docs.google.com/document/d/102sigDokij1tO7FX5gMgsjtJZ01rXbIa9SR6wv4wLUQ/edit?usp=drive_link",
          },
        ],
      },
      { id: "vat-tin", label: "TIN" },
    ],
  },
  {
    id: "rmv-registration",
    title: "RMV Registration",
    items: [
      { id: "mta2", label: "MTA-2", links: [{ label: "Form", url: "https://dmt.gov.lk/images/PDF/Downloads/Forms/mta2_1.pdf" }] },
      {
        id: "affidavit",
        label: "Affidavit",
        links: [{ label: "Template", url: "https://drive.google.com/file/d/1404_rNb62DL8lQo5JG5bKDJZN4O2TorK/view?usp=drive_link" }],
      },
      { id: "rmv-tin", label: "TIN" },
      { id: "nic-dl-copy", label: "Photocopy of NIC/driving license" },
      { id: "photos", label: "02 passport-size certified photographs of the applicant" },
      {
        id: "import-docs",
        label: "Import Docs",
        children: [
          { id: "export-certificate", label: "Export certificate" },
          { id: "export-certificate-translation", label: "English Translation of the export certificate" },
          { id: "inspection-certificate", label: "Inspection certificate (JAAI/JEVIC)" },
          { id: "odo-certificate", label: "ODO Meter certificate", notRequired: true },
          { id: "environment-certificate", label: "Environment certificate", notRequired: true },
          { id: "customs-assessment-notice", label: "Customs Assessment Notice" },
          { id: "customs-53", label: "Customs-53" },
        ],
      },
    ],
  },
];

const STORAGE_KEY = "documents-checklist-v1";

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

export default function DocumentsChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(loadChecked);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures (e.g. private browsing)
      }
      return next;
    });
  }

  function resetAll() {
    setChecked({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
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
          <h1 className="text-lg font-semibold text-gray-900">Documents Checklist</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track the documents needed for customs clearance, temporary VAT, and RMV registration. Ticks
            are saved on this device only.
          </p>
        </div>
        <div className="flex flex-none items-center gap-3 print:hidden">
          <button type="button" onClick={resetAll} className="text-xs text-gray-400 hover:text-red-700">
            Reset
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Download PDF
          </button>
        </div>
      </div>

      {CHECKLIST.map((section) => {
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
