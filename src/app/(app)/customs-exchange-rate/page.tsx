"use client";

import { useEffect, useState } from "react";
import { EXCHANGE_RATES_PAGE } from "@/lib/customsExchangeRate";

type RateResponse = {
  jpyRate: number;
  effectiveFrom: string;
  effectiveTo: string;
  pdfUrl: string;
  fetchedAt: string;
  cached: boolean;
  stale?: boolean;
  error?: string;
};

export default function CustomsExchangeRatePage() {
  const [data, setData] = useState<RateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchRate(force: boolean) {
    return fetch(`/api/customs-exchange-rate${force ? "?force=1" : ""}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Something went wrong.");
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRate(false);
  }, []);

  function handleRefresh() {
    setLoading(true);
    setError(null);
    fetchRate(true);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-3 border-l-4 border-red-700 pl-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Customs Exchange Rate (JPY)</h1>
          <p className="mt-1 text-sm text-gray-500">
            This week&apos;s official JPY rate, extracted from Sri Lanka Customs&apos; latest published
            rates PDF. Cached once per day — use Refresh to force a live re-check.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex-none rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data?.stale && (
        <p className="text-sm text-amber-700">
          Live refresh failed ({data.error}) — showing the last cached rate instead.
        </p>
      )}

      {data && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-xs font-medium text-gray-400">1 JPY =</p>
          <p className="mt-1 text-4xl font-bold text-red-700">Rs. {data.jpyRate.toFixed(4)}</p>
          <p className="mt-2 text-sm text-gray-500">
            Effective {data.effectiveFrom} to {data.effectiveTo}
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Source:{" "}
            <a href={data.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline">
              Sri Lanka Customs Rates PDF
            </a>{" "}
            ·{" "}
            <a href={EXCHANGE_RATES_PAGE} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline">
              Exchange Rates page
            </a>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {data.cached ? "Cached from" : "Freshly fetched"} {new Date(data.fetchedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
