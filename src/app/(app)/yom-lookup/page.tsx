"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChassisYearRange } from "@/lib/types";
import { evaluateYom, type YomResult } from "@/lib/yom";

export default function YomLookupPage() {
  const supabase = createClient();
  const [chassisCode, setChassisCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YomResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const code = chassisCode.trim();
    const serial = Number(serialNumber.trim());

    if (!code) {
      setError("Enter a chassis code.");
      return;
    }
    if (!serialNumber.trim() || !Number.isFinite(serial)) {
      setError("Enter a valid numeric serial number.");
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("chassis_year_ranges")
      .select("*")
      .ilike("chassis_code", code);
    setLoading(false);

    if (queryError) {
      setError(queryError.message);
      return;
    }

    const rows = (data ?? []) as ChassisYearRange[];
    setResult(evaluateYom(rows, serial));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">YOM Lookup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Look up a vehicle&apos;s manufacture year from its chassis code and serial number, based on
          official JAMA reference tables.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="block">
          <span className="block text-xs font-medium text-gray-500">Chassis Code</span>
          <input
            value={chassisCode}
            onChange={(e) => setChassisCode(e.target.value)}
            placeholder="e.g. MXAA54"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-500">Serial Number</span>
          <input
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="e.g. 2040000"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <div className="col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {loading ? "Looking up…" : "Look up"}
          </button>
        </div>
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.status === "MATCH" && result.importable
              ? "border-green-200 bg-green-50"
              : result.status === "PROJECTED_2026"
                ? "border-blue-200 bg-blue-50"
                : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-sm font-medium text-gray-900">{result.message}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
            {result.year != null && (
              <>
                <dt className="text-gray-400">Manufacture year</dt>
                <dd>{result.year}</dd>
              </>
            )}
            {result.makes && (
              <>
                <dt className="text-gray-400">Make(s)</dt>
                <dd>{result.makes}</dd>
              </>
            )}
            <dt className="text-gray-400">Import status</dt>
            <dd className={result.importable ? "font-medium text-green-700" : "font-medium text-red-700"}>
              {result.importable ? "Importable" : "Cannot import"}
            </dd>
            {result.notes && (
              <>
                <dt className="text-gray-400">Notes</dt>
                <dd>{result.notes}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
