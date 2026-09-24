import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchBocJpyRate, ttRateFromBoc } from "@/lib/bocExchangeRate";

const TIMEZONE = "Asia/Colombo";

function localDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}

type CacheRow = {
  jpy_rate: number | null;
  as_at: string | null;
  fetched_at: string | null;
};

function fromCache(cached: CacheRow & { jpy_rate: number }) {
  return {
    jpyRate: cached.jpy_rate,
    ttRate: ttRateFromBoc(cached.jpy_rate),
    asAt: cached.as_at,
    fetchedAt: cached.fetched_at,
    cached: true,
  };
}

export async function GET(request: Request) {
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

  const force = new URL(request.url).searchParams.get("force") === "1";

  const { data: cached } = await supabase.from("boc_exchange_rate_cache").select("*").eq("id", 1).single<CacheRow>();

  const cacheIsFresh =
    !force &&
    cached?.jpy_rate != null &&
    !!cached.fetched_at &&
    localDateString(new Date(cached.fetched_at)) === localDateString(new Date());

  if (cacheIsFresh && cached?.jpy_rate != null) {
    return NextResponse.json(fromCache({ ...cached, jpy_rate: Number(cached.jpy_rate) }));
  }

  try {
    const fresh = await fetchBocJpyRate();
    const fetchedAt = new Date().toISOString();

    await supabase
      .from("boc_exchange_rate_cache")
      .update({ jpy_rate: fresh.jpyRate, as_at: fresh.asAt, fetched_at: fetchedAt })
      .eq("id", 1);

    return NextResponse.json({ ...fresh, ttRate: ttRateFromBoc(fresh.jpyRate), fetchedAt, cached: false });
  } catch (err) {
    // Live refresh failed — fall back to whatever's cached, even if stale, rather than a hard error.
    if (cached?.jpy_rate != null) {
      return NextResponse.json({
        ...fromCache({ ...cached, jpy_rate: Number(cached.jpy_rate) }),
        stale: true,
        error: err instanceof Error ? err.message : "Live refresh failed.",
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch the BOC exchange rate." },
      { status: 502 },
    );
  }
}
