import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchBocJpyRate, type BocJpyRate } from "@/lib/bocExchangeRate";

// CBSL's JPY/LKR indicative rate chart (cbsl.gov.lk/en/rates-and-indicators/exchange-rates/
// jpy-lkr-indicative-rate-chart) loads its data from this endpoint as "YYYY-MM-DD<TAB>rate" lines,
// one per working day for the last year. It's undocumented, so treat a parse failure as "no data".
const CBSL_ONE_YEAR_URL = "https://www.cbsl.gov.lk/cbsl_custom/charts/jpy/oneyear.php";

const TIMEZONE = "Asia/Colombo";

export type RateSource = "CBSL" | "BOC";
export type RatePoint = { date: string; rate: number };

export function colomboDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}

export async function fetchCbslJpyHistory(): Promise<RatePoint[]> {
  const res = await fetch(CBSL_ONE_YEAR_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`CBSL rate history request failed (${res.status})`);
  const points = (await res.text())
    .split("\n")
    .map((line) => line.trim().split("\t"))
    .filter(([date, rate]) => /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") && rate)
    .map(([date, rate]) => ({ date, rate: Number(rate.replace(/,/g, "")) }))
    .filter((p) => Number.isFinite(p.rate) && p.rate > 0);
  if (points.length === 0) throw new Error("CBSL rate history came back empty.");
  return points;
}

// BOC's "as at" is "DD.MM.YYYY hh:mm:ss AM"; the rate belongs to that date, not the date we fetched it.
function bocRateDate(rate: BocJpyRate, fetchedAt: Date): string {
  const m = rate.asAt?.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : colomboDate(fetchedAt);
}

/** Fetches BOC's live JPY rate, updates the daily cache, and records it in the rate history. */
export async function refreshBocRate(supabase: SupabaseClient): Promise<BocJpyRate & { fetchedAt: string }> {
  const fresh = await fetchBocJpyRate();
  const now = new Date();
  const fetchedAt = now.toISOString();

  await supabase
    .from("boc_exchange_rate_cache")
    .update({ jpy_rate: fresh.jpyRate, as_at: fresh.asAt, fetched_at: fetchedAt })
    .eq("id", 1);
  await supabase
    .from("exchange_rate_history")
    .upsert({ source: "BOC", rate_date: bocRateDate(fresh, now), jpy_rate: fresh.jpyRate, fetched_at: fetchedAt });

  return { ...fresh, fetchedAt };
}

/** Re-downloads CBSL's last year of JPY rates and upserts them into the rate history. */
export async function refreshCbslHistory(supabase: SupabaseClient): Promise<number> {
  const points = await fetchCbslJpyHistory();
  const fetchedAt = new Date().toISOString();
  const { error } = await supabase
    .from("exchange_rate_history")
    .upsert(points.map((p) => ({ source: "CBSL", rate_date: p.date, jpy_rate: p.rate, fetched_at: fetchedAt })));
  if (error) throw new Error(`Could not save CBSL rate history: ${error.message}`);
  return points.length;
}

export async function cbslFetchedToday(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from("exchange_rate_history")
    .select("fetched_at")
    .eq("source", "CBSL")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ fetched_at: string }>();
  return !!data && colomboDate(new Date(data.fetched_at)) === colomboDate(new Date());
}
