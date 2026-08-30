"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings, VehicleReferencePrice } from "@/lib/types";
import { depreciatedFob } from "@/lib/vehiclePricing";
import type { FuelCategory } from "@/lib/taxRates";

const LKR = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });
const JPY = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const fmtLkr = (n: number) => `Rs. ${LKR.format(n)}`;
const fmtJpy = (n: number) => `JPY ${JPY.format(n)}`;

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
  const [importerFee, setImporterFee] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [lcRate, setLcRate] = useState("");
  const [ttRate, setTtRate] = useState("");
  const [customsRate, setCustomsRate] = useState("");

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

  function handleVehicleNameChange(value: string) {
    setVehicleName(value);
    const match = vehicles.find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setCapacity(String(match.capacity));
      setFuel(match.fuel === "Hybrid" ? "Hybrid" : match.fuel === "Series_Hybrid" ? "Series_Hybrid" : "Petrol");
      setLcValue(String(depreciatedFob(match.website_value_jpy)));
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
    const totalLkr = lcCostLkr + ttCostLkr + fields.bankLcCharges + fields.importerFee + fields.taxAmount;

    setOutput({ totalCostJapan, lcCostLkr, ttCostLkr, totalLkr });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Quotation Generator</h1>
        <p className="mt-1 text-sm text-gray-500">Build a cost quotation for a vehicle purchase.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
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

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Buying Price (JPY)</span>
            <input
              value={buyingPrice}
              onChange={(e) => setBuyingPrice(e.target.value)}
              placeholder="e.g. 1200000"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Exporter Shipping &amp; Handling (JPY)</span>
            <input
              value={exporterShippingHandling}
              onChange={(e) => setExporterShippingHandling(e.target.value)}
              placeholder="e.g. 50000"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Importer Shipping &amp; Handling (JPY)</span>
            <input
              value={importerShippingHandling}
              onChange={(e) => setImporterShippingHandling(e.target.value)}
              placeholder="e.g. 60000"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">LC Value (JPY)</span>
            <input
              value={lcValue}
              onChange={(e) => setLcValue(e.target.value)}
              placeholder="e.g. 1500000"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">TT Value (JPY)</span>
            <input
              value={ttValue}
              onChange={(e) => setTtValue(e.target.value)}
              placeholder="e.g. 0"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Bank LC Charges (LKR)</span>
            <input
              value={bankLcCharges}
              onChange={(e) => setBankLcCharges(e.target.value)}
              placeholder="e.g. 25000"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Importer Fee (LKR)</span>
            <input
              value={importerFee}
              onChange={(e) => setImporterFee(e.target.value)}
              placeholder="e.g. 200000"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Tax Amount (LKR)</span>
            <input
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              placeholder="from the Tax Calculator"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>

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
        <p className="text-xs text-gray-400">
          Rates default from Settings. Customs rate is shown on the quotation for reference — Tax Amount above is
          entered directly (e.g. from the Tax Calculator), not recomputed here.
        </p>

        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Generate Quotation
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {output && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">Quotation for {vehicleName}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
            <dt className="text-gray-400">Capacity</dt>
            <dd>
              {capacity} {fuel === "Series_Hybrid" ? "kW" : "cc"}
            </dd>
            <dt className="text-gray-400">Fuel Type</dt>
            <dd>{fuel}</dd>
            <dt className="text-gray-400">YOM</dt>
            <dd>{yom || "—"}</dd>
            <dt className="text-gray-400">Colour</dt>
            <dd>{colour || "—"}</dd>
            <dt className="text-gray-400">Auction Grade</dt>
            <dd>{auctionGrade || "—"}</dd>
            <dt className="text-gray-400">Buying Price</dt>
            <dd>{fmtJpy(Number(buyingPrice))}</dd>
            <dt className="text-gray-400">Exporter Shipping &amp; Handling</dt>
            <dd>{fmtJpy(Number(exporterShippingHandling || 0))}</dd>
            <dt className="text-gray-400">Importer Shipping &amp; Handling</dt>
            <dd>{fmtJpy(Number(importerShippingHandling || 0))}</dd>
            <dt className="font-medium text-gray-900">Total Cost in Japan</dt>
            <dd className="font-medium text-gray-900">{fmtJpy(output.totalCostJapan)}</dd>
            <dt className="text-gray-400">LC Value</dt>
            <dd>{fmtJpy(Number(lcValue))}</dd>
            <dt className="text-gray-400">LC Cost (LC Value × LC Rate)</dt>
            <dd>{fmtLkr(output.lcCostLkr)}</dd>
            <dt className="text-gray-400">TT Value</dt>
            <dd>{fmtJpy(Number(ttValue || 0))}</dd>
            <dt className="text-gray-400">TT Cost (TT Value × TT Rate)</dt>
            <dd>{fmtLkr(output.ttCostLkr)}</dd>
            <dt className="text-gray-400">Bank LC Charges</dt>
            <dd>{fmtLkr(Number(bankLcCharges || 0))}</dd>
            <dt className="text-gray-400">Importer Fee</dt>
            <dd>{fmtLkr(Number(importerFee || 0))}</dd>
            <dt className="text-gray-400">Tax Amount</dt>
            <dd>{fmtLkr(Number(taxAmount || 0))}</dd>
            <dt className="text-gray-400">Customs Rate (reference)</dt>
            <dd>{customsRate}</dd>
            <dt className="font-medium text-gray-900">Total Quotation Amount</dt>
            <dd className="font-medium text-gray-900">{fmtLkr(output.totalLkr)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
