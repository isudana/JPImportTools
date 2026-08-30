"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings, VehicleReferencePrice } from "@/lib/types";
import { depreciatedFob } from "@/lib/vehiclePricing";
import { calculateTax, type FuelCategory } from "@/lib/taxRates";

const LKR = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });
const JPY = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const fmtLkr = (n: number) => `Rs. ${LKR.format(n)}`;
const fmtJpy = (n: number) => `JPY ${JPY.format(n)}`;

type SectionColor = "indigo" | "amber" | "emerald";

const SECTION_STYLES: Record<SectionColor, { card: string; title: string }> = {
  indigo: { card: "border-indigo-200 bg-indigo-50", title: "text-indigo-700" },
  amber: { card: "border-amber-200 bg-amber-50", title: "text-amber-700" },
  emerald: { card: "border-emerald-200 bg-emerald-50", title: "text-emerald-700" },
};

function Section({ title, color, children }: { title: string; color: SectionColor; children: React.ReactNode }) {
  const styles = SECTION_STYLES[color];
  return (
    <div className={`space-y-3 rounded-lg border p-4 ${styles.card}`}>
      <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
      {children}
    </div>
  );
}

type Output = {
  totalCostJapan: number;
  lcCostLkr: number;
  ttCostLkr: number;
  totalLkr: number;
};

export default function QuotationPage() {
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<VehicleReferencePrice[]>([]);

  const [vehicleName, setVehicleName] = useState("");
  const [fuel, setFuel] = useState<FuelCategory>("Petrol");
  const [capacity, setCapacity] = useState("");
  const [yom, setYom] = useState("");
  const [colour, setColour] = useState("");
  const [auctionGrade, setAuctionGrade] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [exporterShippingHandling, setExporterShippingHandling] = useState("");
  const [importerShippingHandling, setImporterShippingHandling] = useState("");
  const [lcValue, setLcValue] = useState("");
  const [ttValue, setTtValue] = useState("");
  const [bankLcCharges, setBankLcCharges] = useState("");
  const [clearingCharges, setClearingCharges] = useState("");
  const [importerFee, setImporterFee] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [lcRate, setLcRate] = useState("");
  const [ttRate, setTtRate] = useState("");
  const [customsRate, setCustomsRate] = useState("");

  const [matchedVehicle, setMatchedVehicle] = useState<VehicleReferencePrice | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<Output | null>(null);

  useEffect(() => {
    supabase
      .from("vehicle_reference_prices")
      .select("*")
      .order("name")
      .then(({ data }) => setVehicles((data ?? []) as VehicleReferencePrice[]));
  }, [supabase]);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const settings = data as AppSettings | null;
        if (!settings) return;
        setLcRate(String(settings.default_lc_rate));
        setTtRate(String(settings.default_tt_rate));
        setCustomsRate(String(settings.default_customs_rate));
      });
  }, [supabase]);

  function vehicleFuelCategory(vehicle: VehicleReferencePrice): FuelCategory {
    return vehicle.fuel === "Hybrid" ? "Hybrid" : vehicle.fuel === "Series_Hybrid" ? "Series_Hybrid" : "Petrol";
  }

  // Recomputes TT Value (Total Cost in Japan − LC Value) and, when a vehicle is matched, Tax Amount.
  // Tax Amount uses the vehicle's Yellow Book CIF normally, but when LC Value exceeds that Yellow
  // Book CIF (JPY) — meaning what's being declared via LC alone already exceeds the reference value —
  // it uses LC Value itself instead.
  function recomputeDerived(
    overrides: Partial<{
      buyingPrice: string;
      exporterShippingHandling: string;
      importerShippingHandling: string;
      lcValue: string;
      vehicle: VehicleReferencePrice | null;
    }>,
  ) {
    const bp = Number((overrides.buyingPrice ?? buyingPrice) || 0);
    const esh = Number((overrides.exporterShippingHandling ?? exporterShippingHandling) || 0);
    const ish = Number((overrides.importerShippingHandling ?? importerShippingHandling) || 0);
    const lc = Number((overrides.lcValue ?? lcValue) || 0);
    const totalCostJapan = bp + esh + ish;
    const newTt = Math.round((totalCostJapan - lc) * 100) / 100;
    setTtValue(String(newTt));

    const vehicle = overrides.vehicle !== undefined ? overrides.vehicle : matchedVehicle;
    if (!vehicle) return;
    const rate = Number(customsRate);
    if (!Number.isFinite(rate) || rate <= 0) return;

    const cifLkr = lc > vehicle.cif_jpy ? lc * rate : vehicle.cif_jpy * rate;
    const tax = calculateTax(vehicleFuelCategory(vehicle), vehicle.capacity, cifLkr, false);
    setTaxAmount(String(Math.round(tax.total * 100) / 100));
  }

  function handleVehicleNameChange(value: string) {
    setVehicleName(value);
    const match = vehicles.find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      const newLcValue = String(depreciatedFob(match.website_value_jpy));
      const exporterBase = match.exporter_base_price_jpy ?? 0;
      const newExporterShippingHandling = String(
        Math.round((exporterBase + Number(buyingPrice || 0) / 10) * 100) / 100,
      );
      setCapacity(String(match.capacity));
      setFuel(vehicleFuelCategory(match));
      setLcValue(newLcValue);
      setMatchedVehicle(match);
      setExporterShippingHandling(newExporterShippingHandling);
      recomputeDerived({
        lcValue: newLcValue,
        exporterShippingHandling: newExporterShippingHandling,
        vehicle: match,
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOutput(null);

    const fields = {
      buyingPrice: Number(buyingPrice),
      exporterShippingHandling: Number(exporterShippingHandling || 0),
      importerShippingHandling: Number(importerShippingHandling || 0),
      lcValue: Number(lcValue),
      ttValue: Number(ttValue || 0),
      bankLcCharges: Number(bankLcCharges || 0),
      clearingCharges: Number(clearingCharges || 0),
      importerFee: Number(importerFee || 0),
      taxAmount: Number(taxAmount || 0),
      lcRate: Number(lcRate),
      ttRate: Number(ttRate),
      customsRate: Number(customsRate),
    };

    if (!vehicleName.trim()) {
      setError("Enter a vehicle name.");
      return;
    }
    if (!Number.isFinite(fields.buyingPrice) || fields.buyingPrice <= 0) {
      setError("Enter a valid buying price.");
      return;
    }
    if (!Number.isFinite(fields.lcValue) || fields.lcValue < 0) {
      setError("Enter a valid LC value.");
      return;
    }
    if (![fields.lcRate, fields.ttRate, fields.customsRate].every((n) => Number.isFinite(n) && n > 0)) {
      setError("Enter valid LC, TT, and Customs exchange rates.");
      return;
    }

    const totalCostJapan = fields.buyingPrice + fields.exporterShippingHandling + fields.importerShippingHandling;
    const lcCostLkr = fields.lcValue * fields.lcRate;
    const ttCostLkr = fields.ttValue * fields.ttRate;
    const totalLkr =
      lcCostLkr + ttCostLkr + fields.bankLcCharges + fields.clearingCharges + fields.importerFee + fields.taxAmount;

    setOutput({ totalCostJapan, lcCostLkr, ttCostLkr, totalLkr });
  }

  const customsRateNum = Number(customsRate);
  const minTaxAmount =
    matchedVehicle && Number.isFinite(customsRateNum) && customsRateNum > 0
      ? calculateTax(
          vehicleFuelCategory(matchedVehicle),
          matchedVehicle.capacity,
          matchedVehicle.cif_jpy * customsRateNum,
          false,
        ).total
      : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Quotation Generator</h1>
        <p className="mt-1 text-sm text-gray-500">Build a cost quotation for a vehicle purchase.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Section title="Vehicle Information" color="indigo">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Vehicle</span>
            <input
              list="vehicle-options"
              value={vehicleName}
              onChange={(e) => handleVehicleNameChange(e.target.value)}
              placeholder="e.g. AQUA HYBRID 1500CC HYBRID X"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
            <datalist id="vehicle-options">
              {vehicles.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Fuel Type</span>
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value as FuelCategory)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="Petrol">Petrol</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Series_Hybrid">Series Hybrid (range-extender)</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">
                {fuel === "Series_Hybrid" ? "Motor Power (kW)" : "Engine Capacity (cc)"}
              </span>
              <input
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={fuel === "Series_Hybrid" ? "e.g. 80" : "e.g. 1500"}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">YOM</span>
              <input
                value={yom}
                onChange={(e) => setYom(e.target.value)}
                placeholder="e.g. 2026"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Colour</span>
              <input
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                placeholder="e.g. White"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Auction Grade</span>
            <input
              value={auctionGrade}
              onChange={(e) => setAuctionGrade(e.target.value)}
              placeholder="e.g. S"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </Section>

        <Section title="Costs in Japan (JPY)" color="amber">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Buying Price</span>
              <input
                value={buyingPrice}
                onChange={(e) => {
                  const newBuyingPrice = e.target.value;
                  setBuyingPrice(newBuyingPrice);
                  if (matchedVehicle) {
                    const exporterBase = matchedVehicle.exporter_base_price_jpy ?? 0;
                    const newExporterShippingHandling = String(
                      Math.round((exporterBase + Number(newBuyingPrice || 0) / 10) * 100) / 100,
                    );
                    setExporterShippingHandling(newExporterShippingHandling);
                    recomputeDerived({ buyingPrice: newBuyingPrice, exporterShippingHandling: newExporterShippingHandling });
                  } else {
                    recomputeDerived({ buyingPrice: newBuyingPrice });
                  }
                }}
                placeholder="e.g. 1200000"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Exporter Shipping &amp; Handling</span>
              <input
                value={exporterShippingHandling}
                onChange={(e) => {
                  setExporterShippingHandling(e.target.value);
                  recomputeDerived({ exporterShippingHandling: e.target.value });
                }}
                placeholder="e.g. 50000"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
              <span className="mt-1 block text-xs text-amber-700/60">
                Auto-filled as Exporter Base Price + 10% of Buying Price once a vehicle is selected.
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Importer Shipping &amp; Handling</span>
              <input
                value={importerShippingHandling}
                onChange={(e) => {
                  setImporterShippingHandling(e.target.value);
                  recomputeDerived({ importerShippingHandling: e.target.value });
                }}
                placeholder="e.g. 60000"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">LC Value</span>
              <input
                value={lcValue}
                onChange={(e) => {
                  setLcValue(e.target.value);
                  recomputeDerived({ lcValue: e.target.value });
                }}
                placeholder="e.g. 1500000"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500">TT Value</span>
            <input
              value={ttValue}
              onChange={(e) => setTtValue(e.target.value)}
              placeholder="e.g. 0"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
            <span className="mt-1 block text-xs text-amber-700/60">
              Auto-filled as Total Cost in Japan − LC Value — editable.
            </span>
          </label>
        </Section>

        <Section title="Costs in LKR" color="emerald">
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">LC JPY to LKR Rate</span>
              <input
                value={lcRate}
                onChange={(e) => setLcRate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">TT JPY to LKR Rate</span>
              <input
                value={ttRate}
                onChange={(e) => setTtRate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Customs JPY to LKR Rate</span>
              <input
                value={customsRate}
                onChange={(e) => setCustomsRate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Bank LC Charges</span>
              <input
                value={bankLcCharges}
                onChange={(e) => setBankLcCharges(e.target.value)}
                placeholder="e.g. 25000"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Clearing Charges</span>
              <input
                value={clearingCharges}
                onChange={(e) => setClearingCharges(e.target.value)}
                placeholder="e.g. 70000"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Importer Fee</span>
              <input
                value={importerFee}
                onChange={(e) => setImporterFee(e.target.value)}
                placeholder="e.g. 200000"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500">Tax Amount</span>
              <input
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="auto-filled from Yellow Book CIF once a vehicle is selected"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>
          {minTaxAmount != null && (
            <div className="rounded-md border border-dashed border-emerald-300 bg-white px-3 py-2">
              <span className="block text-xs font-medium text-gray-500">
                Minimum Tax Amount (view only, based on Yellow Book CIF)
              </span>
              <span className="mt-0.5 block text-sm font-medium text-gray-900">{fmtLkr(minTaxAmount)}</span>
            </div>
          )}
          <p className="text-xs text-emerald-700/70">
            Rates default from Settings. Tax Amount auto-fills from the vehicle&apos;s Yellow Book CIF (Depreciated FOB +
            Shipping &amp; Insurance) at the Customs rate — except when LC Value exceeds that Yellow Book CIF, where it
            uses LC Value at the Customs rate instead. Still editable if the actual duty differs.
          </p>
        </Section>

        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Generate Quotation
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {output && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-900">Quotation for {vehicleName}</p>

          <Section title="Vehicle Information" color="indigo">
            <dl className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <dt className="text-indigo-700/60">Capacity</dt>
              <dd>
                {capacity} {fuel === "Series_Hybrid" ? "kW" : "cc"}
              </dd>
              <dt className="text-indigo-700/60">Fuel Type</dt>
              <dd>{fuel}</dd>
              <dt className="text-indigo-700/60">YOM</dt>
              <dd>{yom || "—"}</dd>
              <dt className="text-indigo-700/60">Colour</dt>
              <dd>{colour || "—"}</dd>
              <dt className="text-indigo-700/60">Auction Grade</dt>
              <dd>{auctionGrade || "—"}</dd>
            </dl>
          </Section>

          <Section title="Costs in Japan (JPY)" color="amber">
            <dl className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <dt className="text-amber-700/60">Buying Price</dt>
              <dd>{fmtJpy(Number(buyingPrice))}</dd>
              <dt className="text-amber-700/60">Shipping &amp; Handling</dt>
              <dd>{fmtJpy(Number(exporterShippingHandling || 0) + Number(importerShippingHandling || 0))}</dd>
              <dt className="font-semibold text-amber-900">Total Cost in Japan</dt>
              <dd className="font-semibold text-amber-900">{fmtJpy(output.totalCostJapan)}</dd>
              <dt className="text-amber-700/60">LC Value</dt>
              <dd>{fmtJpy(Number(lcValue))}</dd>
              <dt className="text-amber-700/60">TT Value</dt>
              <dd>{fmtJpy(Number(ttValue || 0))}</dd>
            </dl>
          </Section>

          <Section title="Costs in LKR" color="emerald">
            <dl className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <dt className="text-emerald-700/60">LC Cost (LC Value × LC Rate)</dt>
              <dd>{fmtLkr(output.lcCostLkr)}</dd>
              <dt className="text-emerald-700/60">TT Cost (TT Value × TT Rate)</dt>
              <dd>{fmtLkr(output.ttCostLkr)}</dd>
              <dt className="text-emerald-700/60">Bank LC Charges</dt>
              <dd>{fmtLkr(Number(bankLcCharges || 0))}</dd>
              <dt className="text-emerald-700/60">Clearing Charges</dt>
              <dd>{fmtLkr(Number(clearingCharges || 0))}</dd>
              <dt className="text-emerald-700/60">Importer Fee</dt>
              <dd>{fmtLkr(Number(importerFee || 0))}</dd>
              <dt className="text-emerald-700/60">Tax Amount</dt>
              <dd>{fmtLkr(Number(taxAmount || 0))}</dd>
              {minTaxAmount != null && (
                <>
                  <dt className="text-emerald-700/60">Minimum Tax Amount (view only, Yellow Book CIF)</dt>
                  <dd>{fmtLkr(minTaxAmount)}</dd>
                </>
              )}
              <dt className="text-emerald-700/60">Customs Rate (reference)</dt>
              <dd>{customsRate}</dd>
            </dl>
          </Section>

          <div className="rounded-lg bg-gray-900 p-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total Quotation Amount</p>
            <p className="mt-1 text-3xl font-bold text-white">{fmtLkr(output.totalLkr)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
