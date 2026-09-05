"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

type Carrier = "mobitel" | "dialog";

type Values = {
  name: string;
  address: string;
  email: string;
  date: string;
  mobile: string;
  officeAddress: string;
  tin: string;
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

function MobileConfirmationLetter({ carrier, values }: { carrier: Carrier; values: Values }) {
  const recipient =
    carrier === "dialog" ? (
      <Lines text={"Dialog Axiata PLC\nNo. 475, Union Place,\nColombo 02"} />
    ) : (
      <>
        <Lines text={"SLT Mobitel\nRegional Telecom Office,\nSri Lanka Telecom,"} />
        {values.officeAddress.trim() && <Lines text={values.officeAddress} />}
      </>
    );

  return (
    <div className="space-y-4 text-sm text-gray-900">
      <p>
        <Lines text={values.name} />
        {values.address.trim() && <Lines text={values.address} />}
        {values.email}
      </p>
      <p>{values.date || todayFormatted()}</p>
      <p>{recipient}</p>
      <p>Dear Sir/Madam,</p>
      <p className="font-medium">Request for Mobile Network Stay Confirmation Letter</p>
      <p>
        Please provide me with a mobile network stay confirmation letter for my mobile number {values.mobile},
        indicating the name, address, and the NIC number.
      </p>
      <p>Thank you.</p>
      <p>
        Sincerely,
        <br />
        <br />
        <br />
        {values.name}
      </p>
    </div>
  );
}

function PersonalUseLetter({ values }: { values: Values }) {
  return (
    <div className="space-y-4 text-sm text-gray-900">
      <p>
        {values.address.trim() && <Lines text={values.address} />}
        {values.email}
      </p>
      <p>{values.date || todayFormatted()}</p>
      <p>
        The Commissioner
        <br />
        Inland Revenue Department,
        <br />
        Colombo 02,
      </p>
      <p>Dear Sir/Madam,</p>
      <p>TIN: {values.tin}</p>
      <p className="font-medium">Confirmation of Vehicle Import for Personal Use</p>
      <p>
        I, {values.name}, hereby confirm that the vehicle I am importing under my name is solely intended for
        personal use and not for any commercial purposes.
      </p>
      <p>Thank you.</p>
      <p>
        Sincerely,
        <br />
        <br />
        <br />
        {values.name}
        <br />
        TIN: {values.tin}
      </p>
    </div>
  );
}

function LetterGeneratorInner() {
  const searchParams = useSearchParams();
  const initialCarrier = searchParams.get("template");
  const [carrier, setCarrier] = useState<Carrier>(initialCarrier === "dialog" ? "dialog" : "mobitel");
  const [values, setValues] = useState<Values>({
    name: "",
    address: "",
    email: "",
    date: todayFormatted(),
    mobile: "",
    officeAddress: "",
    tin: "",
  });

  function setField(key: keyof Values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-3xl space-y-6 print:max-w-none">
      <div className="flex items-start justify-between gap-3 border-l-4 border-red-700 pl-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Letter Generator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in your details once to generate both Clearance letters: the mobile network stay confirmation
            request and the IRD letter of personal use.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            document.title = `Clearance Letters - ${values.name || "Vehicle Import"}`;
            window.print();
          }}
          className="flex-none rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Download PDF
        </button>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Full Name</span>
            <input
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Email</span>
            <input
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="col-span-2 block">
            <span className="block text-xs font-medium text-gray-500">Address</span>
            <textarea
              value={values.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder={"Address line 1\nAddress line 2\nAddress line 3"}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Date</span>
            <input
              value={values.date}
              onChange={(e) => setField("date", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">TIN</span>
            <input
              value={values.tin}
              onChange={(e) => setField("tin", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500">Mobile Carrier</p>
          <div className="mt-1 flex gap-4 text-sm text-gray-700">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={carrier === "mobitel"} onChange={() => setCarrier("mobitel")} />
              Mobitel
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={carrier === "dialog"} onChange={() => setCarrier("dialog")} />
              Dialog
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Mobile Number</span>
              <input
                value={values.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            {carrier === "mobitel" && (
              <label className="block">
                <span className="block text-xs font-medium text-gray-500">
                  Your Regional Telecom Office Address <span className="font-normal text-gray-400">(optional)</span>
                </span>
                <input
                  value={values.officeAddress}
                  onChange={(e) => setField("officeAddress", e.target.value)}
                  placeholder="Fill in if known — otherwise leave blank and add it by hand"
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-400 uppercase print:hidden">
          {carrier === "dialog" ? "Dialog" : "Mobitel"} Mobile Network Stay Confirmation Request
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-6 print:break-after-page print:border-0 print:p-0">
          <MobileConfirmationLetter carrier={carrier} values={values} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-400 uppercase print:hidden">
          IRD Letter of Personal Use
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-6 print:border-0 print:p-0">
          <PersonalUseLetter values={values} />
        </div>
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
