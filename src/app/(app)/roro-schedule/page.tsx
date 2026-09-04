"use client";

import { useEffect, useState } from "react";
import type { RoroSailing } from "@/lib/roroSchedule";

type ScheduleResponse = { sailings: RoroSailing[]; sourceUrl: string; fetchedAt: string };

export default function RoroSchedulePage() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchSchedule() {
    return fetch("/api/roro-schedule")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Something went wrong.");
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSchedule();
  }, []);

  function handleRefresh() {
    setLoading(true);
    setError(null);
    fetchSchedule();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-l-4 border-red-700 pl-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">RO-RO Shipping Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upcoming RO-RO sailings from Japan to Hambantota, with Japan port departure dates (and
            cargo cutoff where shown).
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

      {data && (
        <>
          <p className="text-xs text-gray-400">
            Source:{" "}
            <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline">
              AutoCJ Japan Shipping Schedule
            </a>{" "}
            — fetched {new Date(data.fetchedAt).toLocaleString()}
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Ship</th>
                  <th className="px-4 py-2">Voyage</th>
                  <th className="px-4 py-2">Japan Departure(s)</th>
                  <th className="px-4 py-2">Hambantota Arrival</th>
                </tr>
              </thead>
              <tbody>
                {data.sailings.map((s, i) => (
                  <tr key={`${s.shipName}-${s.voyage}-${i}`} className="border-b border-gray-100 text-gray-600 last:border-0">
                    <td className="px-4 py-2">{s.company}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{s.shipName}</td>
                    <td className="px-4 py-2">{s.voyage}</td>
                    <td className="px-4 py-2">
                      <div className="space-y-0.5">
                        {s.japanPorts.map((p, j) => (
                          <div key={j}>
                            {p.port} — {p.date}
                            {p.cutoff && <span className="text-gray-400"> (Cut: {p.cutoff})</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{s.hambantotaDate}</td>
                  </tr>
                ))}
                {data.sailings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      No upcoming Hambantota sailings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
