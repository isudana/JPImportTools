"use client";

import { useState } from "react";
import type { YomResult } from "@/lib/yom";

type AnalyzeResult = {
  explanation: string;
  chassisCode: string | null;
  serialNumber: number | null;
  yom: YomResult | null;
};

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

function resizeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode the image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AuctionSheetAnalyzerPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{ base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
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
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
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
          {result.chassisCode && (
            <div
              className={`rounded-lg border p-4 ${
                result.yom?.status === "MATCH" && result.yom.importable
                  ? "border-green-200 bg-green-50"
                  : result.yom?.status === "PROJECTED_2026"
                    ? "border-blue-200 bg-blue-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-xs font-medium text-gray-500">
                Chassis {result.chassisCode}
                {result.serialNumber != null ? ` ${result.serialNumber}` : ""} — cross-checked against
                reference data
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {result.yom?.message ?? "Chassis code extracted, but not enough of the serial number was legible to check the year."}
              </p>
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
