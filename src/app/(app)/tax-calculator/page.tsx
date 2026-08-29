"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VehicleReferencePrice } from "@/lib/types";
import { calculateTax, type FuelCategory, type TaxBreakdown } from "@/lib/taxRates";

const LKR = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });
const fmt = (n: number) => `Rs. ${LKR.format(n)}`;

export default function TaxCalculatorPage() {
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<VehicleReferencePrice[]>([]);

  const [vehicleName, setVehicleName] = useState("");
  const [fuel, setFuel] = useState<FuelCategory>("Petrol");
  const [capacity, setCapacity] = useState("");
  const [yomWithinOneYear, setYomWithinOneYear] = useState(false);
  const [buyingPrice, setBuyingPrice] = useState("");
  const [shippingInsurance, setShippingInsurance] = useState("");
  const [rate, setRate] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<{
    breakdown: TaxBreakdown;
    invoicedCif: number;
    yellowBookCif: number | null;
    basis: "Invoiced Price" | "Yellow Book Reference Price";
  } | null>(null);

  useEffect(() => {
    supabase
      .from("vehicle_reference_prices")
      .select("*")
      .order("name")
      .then(({ data }) => setVehicles((data ?? []) as VehicleReferencePrice[]));
  }, [supabase]);

  function handleVehicleNameChange(value: string) {
    setVehicleName(value);
    const match = vehicles.find((v) => v.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setCapacity(String(match.capacity));
      setFuel(match.fuel === "Hybrid" ? "Hybrid" : match.fuel === "Series_Hybrid" ? "Series_Hybrid" : "Petrol");
      const depreciatedFob = Math.round((((match.website_value_jpy * 100) / 110) * 0.85) * 100) / 100;
      setBuyingPrice(String(depreciatedFob));
      setShippingInsurance(String(match.shipping_insurance_jpy));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOutput(null);

    const cap = Number(capacity);
    const price = Number(buyingPrice);
    const shipping = Number(shippingInsurance);
    const rateNum = Number(rate);

    if (!Number.isFinite(cap) || cap <= 0) {
      setError(fuel === "Series_Hybrid" ? "Enter a valid motor power (kW)." : "Enter a valid engine capacity (cc).");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid buying price.");
      return;
    }
    if (!Number.isFinite(shipping) || shipping < 0) {
      setError("Enter a valid shipping, handling and insurance amount.");
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      setError("Enter a valid JPY to LKR customs exchange rate.");
      return;
    }

    const match = vehicles.find((v) => v.name.toLowerCase() === vehicleName.trim().toLowerCase());

    const totalCostJapan = price + shipping;
    const invoicedCif = totalCostJapan * rateNum;
    const yellowBookCif = match ? match.cif_jpy * rateNum : null;
    const customsCif = yellowBookCif != null ? Math.max(invoicedCif, yellowBookCif) : invoicedCif;
    const basis: "Invoiced Price" | "Yellow Book Reference Price" =
      yellowBookCif != null && yellowBookCif > invoicedCif ? "Yellow Book Reference Price" : "Invoiced Price";

    setOutput({
      breakdown: calculateTax(fuel, cap, customsCif, yomWithinOneYear),
      invoicedCif,
      yellowBookCif,
      basis,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Vehicle Tax Calculator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Estimate Sri Lanka Customs duty (CID, SUR, XID, VAT, VEL, LXT, SSCL) for importing a vehicle.
          Customs CIF is always the higher of your invoiced cost and the Yellow Book reference price — never
          only the invoiced amount.
        </p>
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

        {fuel === "Series_Hybrid" && (
          <label className="block">
            <span className="block text-xs font-medium text-gray-500">Manufactured within the last 1 year?</span>
            <select
              value={yomWithinOneYear ? "Yes" : "No"}
              onChange={(e) => setYomWithinOneYear(e.target.value === "Yes")}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </label>
        )}

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
            <span className="block text-xs font-medium text-gray-500">Shipping, Handling &amp; Insurance (JPY)</span>
            <input
              value={shippingInsurance}
              onChange={(e) => setShippingInsurance(e.target.value)}
              placeholder="e.g. 110000"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-gray-500">Customs JPY to LKR Rate</span>
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="e.g. 2.10"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Calculate
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {output && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-gray-900">
              Customs CIF basis: <span className="font-semibold">{output.basis}</span>
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
              <dt className="text-gray-400">Invoiced CIF (LKR)</dt>
              <dd>{fmt(output.invoicedCif)}</dd>
              <dt className="text-gray-400">Yellow Book CIF (LKR)</dt>
              <dd>{output.yellowBookCif != null ? fmt(output.yellowBookCif) : "N/A — vehicle not matched"}</dd>
              <dt className="text-gray-400 font-medium text-gray-900">Customs CIF used (LKR)</dt>
              <dd className="font-medium text-gray-900">{fmt(output.breakdown.cif)}</dd>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900">Tax Breakdown</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
              <dt className="text-gray-400">CID (30%)</dt>
              <dd>{fmt(output.breakdown.cid)}</dd>
              <dt className="text-gray-400">SUR (50% of CID)</dt>
              <dd>{fmt(output.breakdown.sur)}</dd>
              <dt className="text-gray-400">XID (Excise Duty)</dt>
              <dd>{fmt(output.breakdown.xid)}</dd>
              <dt className="text-gray-400">VAT (18%)</dt>
              <dd>{fmt(output.breakdown.vat)}</dd>
              <dt className="text-gray-400">VEL</dt>
              <dd>{fmt(output.breakdown.vel)}</dd>
              <dt className="text-gray-400">LXT (Luxury Tax)</dt>
              <dd>{fmt(output.breakdown.lxt)}</dd>
              <dt className="text-gray-400">SSCL (2.5%)</dt>
              <dd>{fmt(output.breakdown.sscl)}</dd>
              <dt className="font-medium text-gray-900">Total Tax</dt>
              <dd className="font-medium text-gray-900">{fmt(output.breakdown.total)}</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
