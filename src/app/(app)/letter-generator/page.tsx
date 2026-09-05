"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

type FieldKey = "name" | "address" | "email" | "date" | "mobile" | "tin" | "officeAddress";

type Field = { key: FieldKey; label: string; placeholder?: string; multiline?: boolean; optional?: boolean };

type TemplateId = "mobitel" | "dialog" | "personal-use";

const NAME: Field = { key: "name", label: "Full Name" };
const ADDRESS: Field = { key: "address", label: "Address", multiline: true, placeholder: "Address line 1\nAddress line 2\nAddress line 3" };
const EMAIL: Field = { key: "email", label: "Email" };
const DATE: Field = { key: "date", label: "Date" };
const MOBILE: Field = { key: "mobile", label: "Mobile Number" };
const TIN: Field = { key: "tin", label: "TIN" };
const OFFICE_ADDRESS: Field = {
  key: "officeAddress",
  label: "Your Regional Telecom Office Address (optional)",
  multiline: true,
  optional: true,
  placeholder: "Fill in if known — otherwise leave blank and add it by hand",
};

const TEMPLATES: Record<TemplateId, { title: string; fields: Field[] }> = {
  mobitel: { title: "Mobitel — Mobile Network Stay Confirmation", fields: [NAME, ADDRESS, EMAIL, DATE, MOBILE, OFFICE_ADDRESS] },
  dialog: { title: "Dialog — Mobile Network Stay Confirmation", fields: [NAME, ADDRESS, EMAIL, DATE, MOBILE] },
  "personal-use": { title: "Letter of Personal Use (IRD)", fields: [NAME, ADDRESS, EMAIL, DATE, TIN] },
};

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i}>
          {line}
          <br />
        </span>
      ))}
    </>
  );
}

function LetterBody({ templateId, values }: { templateId: TemplateId; values: Record<string, string> }) {
  const v = (key: FieldKey) => values[key]?.trim() || "";

  if (templateId === "mobitel" || templateId === "dialog") {
    const recipient =
      templateId === "dialog" ? (
        <Lines text={"Dialog Axiata PLC\nNo. 475, Union Place,\nColombo 02"} />
      ) : (
        <>
          <Lines text={"SLT Mobitel\nRegional Telecom Office,\nSri Lanka Telecom,"} />
          {v("officeAddress") && <Lines text={v("officeAddress")} />}
        </>
      );
    return (
      <div className="space-y-4 text-sm text-gray-900">
        <p>
          <Lines text={v("name")} />
          {v("address") && <Lines text={v("address")} />}
          {v("email")}
        </p>
        <p>{v("date") || todayFormatted()}</p>
        <p>{recipient}</p>
        <p>Dear Sir/Madam,</p>
        <p className="font-medium">Request for Mobile Network Stay Confirmation Letter</p>
        <p>
          Please provide me with a mobile network stay confirmation letter for my mobile number {v("mobile")},
          indicating the name, address, and the NIC number.
        </p>
        <p>Thank you.</p>
        <p>
          Sincerely,
          <br />
          <br />
          <br />
          {v("name")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-gray-900">
      <p>
        {v("address") && <Lines text={v("address")} />}
        {v("email")}
      </p>
      <p>{v("date") || todayFormatted()}</p>
      <p>
        The Commissioner
        <br />
        Inland Revenue Department,
        <br />
        Colombo 02,
      </p>
      <p>Dear Sir/Madam,</p>
      <p>TIN: {v("tin")}</p>
      <p className="font-medium">Confirmation of Vehicle Import for Personal Use</p>
      <p>
        I, {v("name")}, hereby confirm that the vehicle I am importing under my name is solely intended for
        personal use and not for any commercial purposes.
      </p>
      <p>Thank you.</p>
      <p>
        Sincerely,
        <br />
        <br />
        <br />
        {v("name")}
        <br />
        TIN: {v("tin")}
      </p>
    </div>
  );
}

function LetterGeneratorInner() {
  const searchParams = useSearchParams();
  const initialTemplate = searchParams.get("template");
  const [templateId, setTemplateId] = useState<TemplateId>(
    initialTemplate && initialTemplate in TEMPLATES ? (initialTemplate as TemplateId) : "mobitel",
  );
  const [values, setValues] = useState<Record<string, string>>({ date: todayFormatted() });

  const template = TEMPLATES[templateId];

  function setField(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-3xl space-y-6 print:max-w-none">
      <div className="flex items-start justify-between gap-3 border-l-4 border-red-700 pl-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Letter Generator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in your details and generate one of the standard letters referenced in the Clearance Checklist.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            document.title = template.title;
            window.print();
          }}
          className="flex-none rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Download PDF
        </button>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <label className="block">
          <span className="block text-xs font-medium text-gray-500">Letter</span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as TemplateId)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
              <option key={id} value={id}>
                {TEMPLATES[id].title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          {template.fields.map((field) => (
            <label key={field.key} className={field.multiline ? "col-span-2 block" : "block"}>
              <span className="block text-xs font-medium text-gray-500">{field.label}</span>
              {field.multiline ? (
                <textarea
                  value={values[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              ) : (
                <input
                  value={values[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 print:border-0 print:p-0">
        <LetterBody templateId={templateId} values={values} />
      </div>
    </div>
  );
}

export default function LetterGeneratorPage() {
  return (
    <Suspense>
      <LetterGeneratorInner />
    </Suspense>
  );
}
