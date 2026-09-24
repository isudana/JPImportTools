"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { ChassisYearRange, VehicleReferencePrice } from "@/lib/types";
import { evaluateYom, type YomResult } from "@/lib/yom";
import { matchGradeSearchSites } from "@/lib/gradeSearchSites";
import { calculateTax, vehicleFuelCategory } from "@/lib/taxRates";
import { TT_RATE_MARGIN } from "@/lib/bocExchangeRate";
import { resizeImage } from "@/lib/resizeImage";
import { UTILITIES } from "@/lib/utilities";
import { RESOURCES } from "@/app/(app)/resources/page";
import { useRole } from "@/components/RoleProvider";
import RateTrendChart, { type RatePoint } from "@/components/RateTrendChart";

// Each stage's items render in the order listed: a utility (by href), a resource (by title), or an
// info item that opens a popup instead of navigating anywhere.
type LifecycleItem = { utility: string } | { resource: string } | { info: InfoItem };
type InfoItem = { title: string; icon: string; message: string; phone?: string };
type LifecyclePhase = { phase: string; items: LifecycleItem[] };

const CUSTOMS_ACCOUNT_ACTIVATION: InfoItem = {
  title: "Customs Account Activation",
  icon: "📞",
  message: "Call 011 214 3434 and get the TIN/VAT section to activate the account.",
  phone: "+94112143434",
};

const LIFECYCLE: LifecyclePhase[] = [
  {
    phase: "Estimation",
    items: [{ utility: "/tax-calculator" }, { utility: "/quotation" }, { utility: "/customs-exchange-rate" }],
  },
  {
    phase: "Selecting the Vehicle",
    items: [
      { utility: "/grade-search" },
      { utility: "/yom-lookup" },
      { utility: "/auction-sheet-analyzer" },
      { resource: "Japan Auction (JP Center)" },
      { resource: "Vehicle History Check" },
    ],
  },
  {
    phase: "Shipping",
    items: [{ utility: "/roro-schedule" }, { resource: "HIPG Berthing Schedule" }],
  },
  {
    phase: "Clearance",
    items: [
      { utility: "/clearance-checklist" },
      { utility: "/letter-generator" },
      { resource: "Customs Account Creation" },
      { info: CUSTOMS_ACCOUNT_ACTIVATION },
      { utility: "/tax-payment-instructions" },
      { resource: "Track My Custdeck" },
    ],
  },
  {
    phase: "RMV Registration",
    items: [{ utility: "/rmv-registration-checklist" }, { resource: "RMV Current Registration Number" }],
  },
];

type RateResponse = { jpyRate: number; effectiveFrom: string; effectiveTo: string };
type BocRateResponse = { jpyRate: number; ttRate: number; asAt: string | null };

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
  const role = useRole();
  const [infoItem, setInfoItem] = useState<InfoItem | null>(null);

  useEffect(() => {
    if (!infoItem) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setInfoItem(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoItem]);

  // Widget 2: rates
  const [customsRate, setCustomsRate] = useState<RateResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [bocRate, setBocRate] = useState<BocRateResponse | null>(null);
  const [bocLoading, setBocLoading] = useState(true);
  const [bocError, setBocError] = useState<string | null>(null);
  const [rateHistory, setRateHistory] = useState<{ cbsl: RatePoint[]; boc: RatePoint[] } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

    fetch("/api/boc-exchange-rate")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Something went wrong.");
        setBocRate(body);
      })
      .catch((err) => setBocError(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => {
        setBocLoading(false);
        // Loaded after the BOC rate so today's BOC point (recorded by that request) is included.
        fetch("/api/rate-history")
          .then(async (res) => {
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Something went wrong.");
            setRateHistory(body);
          })
          .catch((err) => setHistoryError(err instanceof Error ? err.message : "Something went wrong."));
      });

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LIFECYCLE.map((phase) => {
          const rows = phase.items.flatMap((item) => {
            if ("utility" in item) {
              const u = UTILITIES.find((u) => u.href === item.utility);
              if (!u || (u.adminOnly && role !== "ADMIN")) return [];
              return [
                <Link
                  key={u.href}
                  href={u.href}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span>{u.icon}</span>
                  <span className="min-w-0 break-words">{u.title}</span>
                </Link>,
              ];
            }
            if ("resource" in item) {
              const r = RESOURCES.find((r) => r.title === item.resource);
              if (!r) return [];
              return [
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 rounded-md px-1.5 py-1 text-sm text-gray-500 hover:bg-gray-50"
                >
                  <span>{r.icon}</span>
                  <span className="min-w-0 break-words">{r.title}</span>
                  <span className="text-xs text-gray-300">↗</span>
                </a>,
              ];
            }
            return [
              <button
                key={item.info.title}
                type="button"
                onClick={() => setInfoItem(item.info)}
                className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>{item.info.icon}</span>
                <span className="min-w-0 break-words">{item.info.title}</span>
              </button>,
            ];
          });

          return (
            <div key={phase.phase} className="rounded-lg border border-gray-200 bg-white p-3">
              <h2 className="text-xs font-semibold tracking-wide text-red-700 uppercase">{phase.phase}</h2>
              <div className="mt-2 space-y-1.5">
                {rows}
                {rows.length === 0 && <p className="px-1.5 text-xs text-gray-300">Nothing yet</p>}
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
        {[
          { label: "LC Rate (BOC JPY), live", value: bocRate?.jpyRate, note: bocRate?.asAt ? `As at ${bocRate.asAt}` : null },
          { label: "TT Rate, live", value: bocRate?.ttRate, note: `BOC rate + ${TT_RATE_MARGIN.toFixed(2)}` },
        ].map((tile) => (
          <div key={tile.label} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-xs font-medium text-gray-400">{tile.label}</p>
            {bocLoading ? (
              <p className="mt-2 text-sm text-gray-400">Loading…</p>
            ) : bocError ? (
              <p className="mt-2 text-sm text-red-600">{bocError}</p>
            ) : tile.value != null ? (
              <>
                <p className="mt-1 text-2xl font-bold text-red-700">Rs. {tile.value.toFixed(4)}</p>
                {tile.note && <p className="mt-1 text-xs text-gray-400">{tile.note}</p>}
              </>
            ) : null}
          </div>
        ))}
      </div>

      {/* LC rate trend */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">JPY to LKR Rate Trend</h2>
        {historyError ? (
          <p className="text-sm text-red-600">{historyError}</p>
        ) : rateHistory ? (
          <RateTrendChart cbsl={rateHistory.cbsl} boc={rateHistory.boc} />
        ) : (
          <p className="text-sm text-gray-400">Loading…</p>
        )}
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

        {role === "ADMIN" && (
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
        )}

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

      {infoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setInfoItem(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-item-title"
            className="relative w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p id="info-item-title" className="text-sm font-semibold text-gray-900">
                {infoItem.icon} {infoItem.title}
              </p>
              <button
                type="button"
                onClick={() => setInfoItem(null)}
                className="text-sm text-gray-400 hover:text-gray-700"
              >
                Close ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-700">{infoItem.message}</p>
            {infoItem.phone && (
              <a
                href={`tel:${infoItem.phone}`}
                className="mt-4 inline-block rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                Call now
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
