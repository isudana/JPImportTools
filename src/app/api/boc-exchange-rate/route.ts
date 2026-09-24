import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ttRateFromBoc } from "@/lib/bocExchangeRate";
import { colomboDate, refreshBocRate } from "@/lib/rateHistory";

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
    colomboDate(new Date(cached.fetched_at)) === colomboDate(new Date());

  if (cacheIsFresh && cached?.jpy_rate != null) {
    return NextResponse.json(fromCache({ ...cached, jpy_rate: Number(cached.jpy_rate) }));
  }

  try {
    const fresh = await refreshBocRate(supabase);
    return NextResponse.json({ ...fresh, ttRate: ttRateFromBoc(fresh.jpyRate), cached: false });
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
