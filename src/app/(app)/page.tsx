"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings, ChassisYearRange, VehicleReferencePrice } from "@/lib/types";
import { evaluateYom, type YomResult } from "@/lib/yom";
import { matchGradeSearchSites } from "@/lib/gradeSearchSites";
import { calculateTax, vehicleFuelCategory } from "@/lib/taxRates";
import { resizeImage } from "@/lib/resizeImage";
import { UTILITIES } from "@/app/(app)/utilities/page";
import { RESOURCES } from "@/app/(app)/resources/page";

type LifecyclePhase = { phase: string; utilityHrefs: string[]; resourceTitles: string[] };

const LIFECYCLE: LifecyclePhase[] = [
  {
    phase: "Estimation",
    utilityHrefs: ["/tax-calculator", "/quotation", "/customs-exchange-rate"],
    resourceTitles: [],
  },
  {
    phase: "Selecting the Vehicle",
    utilityHrefs: ["/grade-search", "/yom-lookup", "/auction-sheet-analyzer"],
    resourceTitles: ["Japan Auction (JP Center)", "Vehicle History Check"],
  },
  {
    phase: "Shipping",
    utilityHrefs: ["/roro-schedule"],
    resourceTitles: ["HIPG Berthing Schedule", "Track My Custdeck"],
  },
  {
    phase: "Clearance",
    utilityHrefs: ["/clearance-checklist", "/tax-payment-instructions"],
    resourceTitles: ["Sri Lanka Customs Account Creation"],
  },
  {
    phase: "RMV Registration",
    utilityHrefs: ["/rmv-registration-checklist"],
    resourceTitles: ["RMV Current Registration Number"],
  },
];

type RateResponse = { jpyRate: number; effectiveFrom: string; effectiveTo: string };

type AuctionSheetResult = {
  explanation: string;
  chassisCode: string | null;
  serialNumber: number | null;
  yom: YomResult | null;
};

function fmtLkr(n: number): string {
  return `Rs. ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const supabase = createClient();

  // Widget 2: rates
  const [customsRate, setCustomsRate] = useState<RateResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Widget 3: quick vehicle check
  const [chassisCode, setChassisCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [yomLoading, setYomLoading] = useState(false);
  const [yomError, setYomError] = useState<string | null>(null);
  const [yomResult, setYomResult] = useState<YomResult | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AuctionSheetResult | null>(null);

  const [vehicles, setVehicles] = useState<VehicleReferencePrice[]>([]);
  const [vehicleName, setVehicleName] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState<VehicleReferencePrice | null>(null);

  useEffect(() => {
    fetch("/api/customs-exchange-rate")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Something went wrong.");
        setCustomsRate(body);
      })
      .catch((err) => setRatesError(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => setRatesLoading(false));

    supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => setAppSettings((data as AppSettings) ?? null));

    supabase
      .from("vehicle_reference_prices")
      .select("*")
      .order("name")
      .then(({ data }) => setVehicles((data as VehicleReferencePrice[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckChassis() {
    const code = chassisCode.trim();
    const serial = Number(serialNumber.trim());
    setYomError(null);
    setYomResult(null);

    if (!code) {
      setYomError("Enter a chassis code.");
      return;
    }
    if (!serialNumber.trim() || !Number.isFinite(serial)) {
      setYomError("Enter a valid numeric serial number.");
      return;
    }

    setYomLoading(true);
    const { data, error } = await supabase.from("chassis_year_ranges").select("*").ilike("chassis_code", code);
    setYomLoading(false);

    if (error) {
      setYomError(error.message);
      return;
    }
    setYomResult(evaluateYom((data ?? []) as ChassisYearRange[], serial));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisError(null);
    setAnalysisResult(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const resized = await resizeImage(file);
      setPendingImage(resized);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Could not process the image.");
      setPendingImage(null);
    }
  }

  async function handleAnalyzeAuctionSheet() {
    if (!pendingImage) return;
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/auction-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: pendingImage.base64, mimeType: pendingImage.mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setAnalysisResult(data);
      if (data.chassisCode) setChassisCode(data.chassisCode);
      if (data.serialNumber != null) setSerialNumber(String(data.serialNumber));
      if (data.yom) setYomResult(data.yom);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleVehicleNameChange(value: string) {
    setVehicleName(value);
    const match = vehicles.find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    setMatchedVehicle(match ?? null);
  }

  const gradeSites = yomResult ? matchGradeSearchSites(yomResult.makes) : [];
  const tentativeTax =
    matchedVehicle && customsRate?.jpyRate
      ? calculateTax(vehicleFuelCategory(matchedVehicle), matchedVehicle.capacity, matchedVehicle.cif_jpy * customsRate.jpyRate, false)
          .total
      : null;

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          An overview of tools by import stage, current rates, and a quick vehicle check.
        </p>
      </div>

      {/* Widget 1: Lifecycle-organized utilities & resources */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {LIFECYCLE.map((phase) => {
          const utilities = phase.utilityHrefs
            .map((href) => UTILITIES.find((u) => u.href === href))
            .filter((u): u is (typeof UTILITIES)[number] => !!u);
          const resources = phase.resourceTitles
            .map((title) => RESOURCES.find((r) => r.title === title))
            .filter((r): r is (typeof RESOURCES)[number] => !!r);

          return (
            <div key={phase.phase} className="rounded-lg border border-gray-200 bg-white p-3">
              <h2 className="text-xs font-semibold tracking-wide text-red-700 uppercase">{phase.phase}</h2>
              <div className="mt-2 space-y-1.5">
                {utilities.map((u) => (
                  <Link
                    key={u.href}
                    href={u.href}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span>{u.icon}</span>
                    <span className="truncate">{u.title}</span>
                  </Link>
                ))}
                {resources.map((r) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-gray-500 hover:bg-gray-50"
                  >
                    <span>{r.icon}</span>
                    <span className="truncate">{r.title}</span>
                    <span className="text-xs text-gray-300">↗</span>
                  </a>
                ))}
                {utilities.length === 0 && resources.length === 0 && (
                  <p className="px-1.5 text-xs text-gray-300">Nothing yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Widget 2: current rates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-medium text-gray-400">Customs Rate (JPY), live</p>
          {ratesLoading ? (
            <p className="mt-2 text-sm text-gray-400">Loading…</p>
          ) : ratesError ? (
            <p className="mt-2 text-sm text-red-600">{ratesError}</p>
          ) : customsRate ? (
            <>
              <p className="mt-1 text-2xl font-bold text-red-700">Rs. {customsRate.jpyRate.toFixed(4)}</p>
              <p className="mt-1 text-xs text-gray-400">
                Eff. {customsRate.effectiveFrom} – {customsRate.effectiveTo}
              </p>
            </>
          ) : null}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-medium text-gray-400">Default LC Rate</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {appSettings ? appSettings.default_lc_rate.toFixed(2) : "…"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            As configured in{" "}
            <Link href="/settings" className="text-red-700 hover:underline">
              Settings
            </Link>
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-xs font-medium text-gray-400">Default TT Rate</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {appSettings ? appSettings.default_tt_rate.toFixed(2) : "…"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            As configured in{" "}
            <Link href="/settings" className="text-red-700 hover:underline">
              Settings
            </Link>
          </p>
        </div>
      </div>

      {/* Widget 3: quick vehicle check */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Quick Vehicle Check</h2>

        <div className="grid grid-cols-2 gap-3">
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
        </div>
        <button
          type="button"
          onClick={handleCheckChassis}
          disabled={yomLoading}
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {yomLoading ? "Checking…" : "Check"}
        </button>
        {yomError && <p className="text-sm text-red-600">{yomError}</p>}

        {yomResult && (
          <div
            className={`rounded-lg border p-3 ${
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

        {yomResult && (
          <div>
            <p className="text-xs font-medium text-gray-500">Check Grade</p>
            {gradeSites.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">
                No dedicated grade search site recognized for this make —{" "}
                <Link href="/grade-search" className="text-red-700 hover:underline">
                  see all manufacturer portals
                </Link>
                .
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {gradeSites.map((site) => (
                  <a
                    key={site.make}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-sm hover:border-red-400"
                  >
                    <Image src={site.logo} alt={`${site.make} logo`} width={40} height={24} className="h-5 w-8 object-contain" />
                    {site.make}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">
              Auction Sheet Photo <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
            />
          </label>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Auction sheet preview" className="mt-2 max-h-60 rounded-md border border-gray-200" />
          )}
          {pendingImage && (
            <button
              type="button"
              onClick={handleAnalyzeAuctionSheet}
              disabled={analyzing}
              className="mt-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Analyze Auction Sheet"}
            </button>
          )}
          {analysisError && <p className="mt-2 text-sm text-red-600">{analysisError}</p>}
          {analysisResult && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">Explanation</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{analysisResult.explanation}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Vehicle Model</span>
            <input
              list="dashboard-vehicle-options"
              value={vehicleName}
              onChange={(e) => handleVehicleNameChange(e.target.value)}
              placeholder="Start typing a vehicle name…"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
            <datalist id="dashboard-vehicle-options">
              {vehicles.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </label>

          {matchedVehicle && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-400">Tentative Customs Tax</p>
              {tentativeTax != null ? (
                <p className="mt-1 text-2xl font-bold text-red-700">{fmtLkr(tentativeTax)}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">Waiting on the live customs rate…</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Based on {matchedVehicle.name}&apos;s Yellow Book CIF (JPY {matchedVehicle.cif_jpy.toLocaleString()}) ×
                today&apos;s customs rate. Not a substitute for the full{" "}
                <Link href="/tax-calculator" className="text-red-700 hover:underline">
                  Tax Calculator
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
