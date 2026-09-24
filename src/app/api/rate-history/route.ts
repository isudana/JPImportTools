import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cbslFetchedToday, refreshCbslHistory, type RatePoint } from "@/lib/rateHistory";

type HistoryRow = { source: "CBSL" | "BOC"; rate_date: string; jpy_rate: number };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("enabled").eq("id", user.id).single();
  if (!profile?.enabled) {
    return NextResponse.json({ error: "Your account is pending admin approval." }, { status: 403 });
  }

  // The daily Supabase cron job normally keeps this fresh; this only covers the case where it hasn't run yet.
  let refreshError: string | null = null;
  if (!(await cbslFetchedToday(supabase))) {
    try {
      await refreshCbslHistory(supabase);
    } catch (err) {
      refreshError = err instanceof Error ? err.message : "Could not refresh CBSL rate history.";
    }
  }

  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const { data, error } = await supabase
    .from("exchange_rate_history")
    .select("source, rate_date, jpy_rate")
    .gte("rate_date", since.toISOString().slice(0, 10))
    .order("rate_date")
    .returns<HistoryRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bySource = (source: HistoryRow["source"]): RatePoint[] =>
    (data ?? []).filter((r) => r.source === source).map((r) => ({ date: r.rate_date, rate: Number(r.jpy_rate) }));

  return NextResponse.json({ cbsl: bySource("CBSL"), boc: bySource("BOC"), refreshError });
}
