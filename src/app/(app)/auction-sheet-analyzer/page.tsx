"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { evaluateYom, type YomResult } from "@/lib/yom";
import type { ChassisYearRange } from "@/lib/types";
import { resizeImage } from "@/lib/resizeImage";

type Annotation = { x: number; y: number; translation: string };

type AnalyzeResult = {
  explanation: string;
  chassisCode: string | null;
  serialNumber: number | null;
  yom: YomResult | null;
  annotations: Annotation[];
};

export default function AuctionSheetAnalyzerPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{ base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const [chassisInput, setChassisInput] = useState("");
  const [serialInput, setSerialInput] = useState("");
  const [yomResult, setYomResult] = useState<YomResult | null>(null);
  const [yomError, setYomError] = useState<string | null>(null);
  const [yomChecking, setYomChecking] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setChassisInput("");
    setSerialInput("");
    setYomResult(null);
    setYomError(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const resized = await resizeImage(file);
      setPending(resized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process the image.");
      setPending(null);
    }
  }

  async function handleAnalyze() {
    if (!pending) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setYomResult(null);
    setYomError(null);

    try {
      const res = await fetch("/api/auction-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: pending.base64, mimeType: pending.mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
        setChassisInput(data.chassisCode ?? "");
        setSerialInput(data.serialNumber != null ? String(data.serialNumber) : "");
        setYomResult(data.yom ?? null);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckYear() {
    const code = chassisInput.trim();
    const serial = Number(serialInput.trim());

    setYomError(null);

    if (!code) {
      setYomError("Enter a chassis code.");
      return;
    }
    if (!serialInput.trim() || !Number.isFinite(serial)) {
      setYomError("Enter a valid numeric serial number.");
      return;
    }

    setYomChecking(true);
    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("chassis_year_ranges")
      .select("*")
      .ilike("chassis_code", code);
    setYomChecking(false);

    if (queryError) {
      setYomError(queryError.message);
      return;
    }

    setYomResult(evaluateYom((data ?? []) as ChassisYearRange[], serial));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Auction Sheet Analyzer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a photo of a Japanese auction sheet to get a detailed English explanation of the
          vehicle&apos;s grade, equipment, and condition. The image is analyzed and not stored.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="block">
          <span className="block text-xs font-medium text-gray-500">Auction Sheet Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
          />
        </label>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Auction sheet preview" className="max-h-80 rounded-md border border-gray-200" />
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!pending || loading}
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <>
          {previewUrl && result.annotations.length > 0 && (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Translated Sections</h2>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={showMarkers}
                    onChange={(e) => setShowMarkers(e.target.checked)}
                  />
                  Show markers
                </label>
              </div>
              <p className="text-xs text-gray-400">
                Numbered markers point roughly at each item — they&apos;re not exact outlines, just enough to
                find the right area. See the matching number in the list below for the translation.
              </p>
              <div className="relative inline-block w-full overflow-hidden rounded-md border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Auction sheet" className="block w-full" />
                {showMarkers &&
                  result.annotations.map((a, i) => (
                    <span
                      key={i}
                      className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-700 text-[11px] font-semibold text-white ring-2 ring-white"
                      style={{ left: `${a.x / 10}%`, top: `${a.y / 10}%` }}
                    >
                      {i + 1}
                    </span>
                  ))}
              </div>
              {showMarkers && (
                <ol className="grid grid-cols-1 gap-1 text-sm text-gray-700 sm:grid-cols-2">
                  {result.annotations.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-700 text-[11px] font-semibold text-white">
                        {i + 1}
                      </span>
                      {a.translation}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">
              Chassis code and serial number extracted from the photo — edit if not recognized or
              incorrect, then check again.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-gray-500">Chassis Code</span>
                <input
                  value={chassisInput}
                  onChange={(e) => setChassisInput(e.target.value)}
                  placeholder="e.g. MXAA54"
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-500">Serial Number</span>
                <input
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="e.g. 2040000"
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleCheckYear}
              disabled={yomChecking}
              className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {yomChecking ? "Checking…" : "Check Year"}
            </button>
            {yomError && <p className="text-sm text-red-600">{yomError}</p>}
          </div>

          {yomResult && (
            <div
              className={`rounded-lg border p-4 ${
                yomResult.status === "MATCH" && yomResult.importable
                  ? "border-green-200 bg-green-50"
                  : yomResult.status === "PROJECTED_2026"
                    ? "border-blue-200 bg-blue-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{yomResult.message}</p>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Explanation</h2>
            <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{result.explanation}</div>
          </div>
        </>
      )}
    </div>
  );
}
