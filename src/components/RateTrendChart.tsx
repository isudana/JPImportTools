"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type RatePoint = { date: string; rate: number };

// Categorical slots 1 and 2 of the dataviz reference palette (validated as a pair on a light surface).
const CBSL_COLOR = "#2a78d6";
const BOC_COLOR = "#eb6834";

const RANGES = [
  { key: "1M", days: 31 },
  { key: "6M", days: 183 },
  { key: "1Y", days: 366 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 48 };
const DAY_MS = 86_400_000;

const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fmtDate = (date: string) =>
  new Date(toMs(date)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtFullDate = (date: string) =>
  new Date(toMs(date)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtRate = (n: number) => n.toFixed(4);

function niceTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const niceStep = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= step) ?? step;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / niceStep) * niceStep; v <= max + 1e-9; v += niceStep) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

function linePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
}

export default function RateTrendChart({ cbsl, boc }: { cbsl: RatePoint[]; boc: RatePoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);
  const [range, setRange] = useState<RangeKey>("1M");
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const hasData = cbsl.length + boc.length > 0;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
    // Re-attach when the plot appears after an empty first render (the container only exists then).
  }, [hasData]);

  const latestMs = Math.max(...[...cbsl, ...boc].map((p) => toMs(p.date)), 0);
  const days = RANGES.find((r) => r.key === range)!.days;
  const fromMs = latestMs - days * DAY_MS;

  const visibleCbsl = useMemo(() => cbsl.filter((p) => toMs(p.date) >= fromMs), [cbsl, fromMs]);
  const visibleBoc = useMemo(() => boc.filter((p) => toMs(p.date) >= fromMs), [boc, fromMs]);
  const dates = useMemo(
    () => [...new Set([...visibleCbsl, ...visibleBoc].map((p) => p.date))].sort(),
    [visibleCbsl, visibleBoc],
  );

  if (dates.length === 0) {
    return <p className="text-sm text-gray-400">No rate history yet.</p>;
  }

  const cbslByDate = new Map(visibleCbsl.map((p) => [p.date, p.rate]));
  const bocByDate = new Map(visibleBoc.map((p) => [p.date, p.rate]));

  const rates = [...visibleCbsl, ...visibleBoc].map((p) => p.rate);
  const pad = Math.max((Math.max(...rates) - Math.min(...rates)) * 0.1, 0.005);
  const yMin = Math.min(...rates) - pad;
  const yMax = Math.max(...rates) + pad;

  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x0 = toMs(dates[0]);
  const xSpan = Math.max(toMs(dates[dates.length - 1]) - x0, DAY_MS);
  const x = (date: string) => MARGIN.left + ((toMs(date) - x0) / xSpan) * plotW;
  const y = (rate: number) => MARGIN.top + (1 - (rate - yMin) / (yMax - yMin)) * plotH;

  const yTicks = niceTicks(yMin, yMax, 4);
  const xTickCount = Math.min(dates.length, Math.max(2, Math.floor(plotW / 90)));
  const xTicks = [...new Set(Array.from({ length: xTickCount }, (_, i) => dates[Math.round((i * (dates.length - 1)) / Math.max(xTickCount - 1, 1))]))];

  const cbslPath = linePath(visibleCbsl.map((p) => ({ x: x(p.date), y: y(p.rate) })));
  const bocPath = linePath(visibleBoc.map((p) => ({ x: x(p.date), y: y(p.rate) })));

  const latestCbsl = cbsl[cbsl.length - 1];
  const prevCbsl = cbsl[cbsl.length - 2];
  const change = latestCbsl && prevCbsl ? latestCbsl.rate - prevCbsl.rate : null;

  function nearestDate(px: number): string {
    return dates.reduce((best, d) => (Math.abs(x(d) - px) < Math.abs(x(best) - px) ? d : best), dates[0]);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = hoverDate ? dates.indexOf(hoverDate) : dates.length - 1;
    const next = Math.min(dates.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)));
    setHoverDate(dates[next]);
  }

  const hoverX = hoverDate ? x(hoverDate) : null;
  const tooltipLeft = hoverX != null ? Math.min(Math.max(hoverX - 80, 0), width - 160) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {latestCbsl && (
            <p className="text-sm text-gray-500">
              <span className="text-2xl font-bold text-gray-900">{fmtRate(latestCbsl.rate)}</span>{" "}
              CBSL on {fmtDate(latestCbsl.date)}
              {change != null && (
                <span className="ml-2 text-xs text-gray-500">
                  {change > 0 ? "▲" : change < 0 ? "▼" : "■"} {change > 0 ? "+" : ""}
                  {change.toFixed(4)} vs previous working day
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex rounded-md border border-gray-200 text-xs" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => {
                setRange(r.key);
                setHoverDate(null);
              }}
              className={`px-2.5 py-1 font-medium ${
                range === r.key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
              } first:rounded-l-md last:rounded-r-md`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="16" y2="4" stroke={CBSL_COLOR} strokeWidth="2" strokeLinecap="round" />
          </svg>
          CBSL indicative rate
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="16" y2="4" stroke={BOC_COLOR} strokeWidth="2" strokeLinecap="round" />
            <circle cx="8" cy="4" r="3" fill={BOC_COLOR} />
          </svg>
          BOC LC rate (TT selling)
        </span>
      </div>

      <div ref={containerRef} className="relative w-full min-w-0">
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`JPY to LKR rate trend, ${range}. Use left and right arrow keys to read values.`}
          tabIndex={0}
          onKeyDown={handleKey}
          onBlur={() => setHoverDate(null)}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverDate(nearestDate(e.clientX - rect.left));
          }}
          onPointerLeave={() => setHoverDate(null)}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1" />
              <text x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#6b7280">
                {t.toFixed(3)}
              </text>
            </g>
          ))}
          {xTicks.map((d, i) => (
            <text
              key={d}
              x={x(d)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              fontSize="11"
              fill="#6b7280"
            >
              {fmtDate(d)}
            </text>
          ))}

          <path d={cbslPath} fill="none" stroke={CBSL_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={bocPath} fill="none" stroke={BOC_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* BOC history only builds up one day at a time, so its points are marked individually. */}
          {visibleBoc.map((p) => (
            <circle key={p.date} cx={x(p.date)} cy={y(p.rate)} r="4" fill={BOC_COLOR} stroke="#ffffff" strokeWidth="2" />
          ))}

          {hoverDate && hoverX != null && (
            <g pointerEvents="none">
              <line x1={hoverX} x2={hoverX} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke="#9ca3af" strokeWidth="1" />
              {cbslByDate.has(hoverDate) && (
                <circle cx={hoverX} cy={y(cbslByDate.get(hoverDate)!)} r="4" fill={CBSL_COLOR} stroke="#ffffff" strokeWidth="2" />
              )}
              {bocByDate.has(hoverDate) && (
                <circle cx={hoverX} cy={y(bocByDate.get(hoverDate)!)} r="5" fill={BOC_COLOR} stroke="#ffffff" strokeWidth="2" />
              )}
            </g>
          )}
        </svg>

        {hoverDate && (
          <div
            className="pointer-events-none absolute top-0 w-40 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm"
            style={{ left: tooltipLeft }}
          >
            <p className="font-medium text-gray-500">{fmtFullDate(hoverDate)}</p>
            {[
              { label: "CBSL", color: CBSL_COLOR, value: cbslByDate.get(hoverDate) },
              { label: "BOC LC", color: BOC_COLOR, value: bocByDate.get(hoverDate) },
            ].map((row) => (
              <p key={row.label} className="mt-1 flex items-center gap-1.5 text-gray-500">
                <svg width="10" height="4" aria-hidden="true">
                  <line x1="0" y1="2" x2="10" y2="2" stroke={row.color} strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="font-semibold text-gray-900">{row.value != null ? fmtRate(row.value) : "—"}</span>
                {row.label}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          CBSL publishes on working days only. BOC&apos;s rate is recorded once a day from when tracking started.
        </p>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="shrink-0 text-xs font-medium text-red-700 hover:underline"
        >
          {showTable ? "Hide table" : "View as table"}
        </button>
      </div>

      {showTable && (
        <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Date</th>
                <th className="px-3 py-1.5 font-medium">CBSL</th>
                <th className="px-3 py-1.5 font-medium">BOC LC</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {[...dates].reverse().map((d) => (
                <tr key={d} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">{fmtFullDate(d)}</td>
                  <td className="px-3 py-1.5">{cbslByDate.has(d) ? fmtRate(cbslByDate.get(d)!) : "—"}</td>
                  <td className="px-3 py-1.5">{bocByDate.has(d) ? fmtRate(bocByDate.get(d)!) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
