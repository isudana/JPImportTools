import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findLatestExchangeRatePdf, extractJpyRateFromPdf } from "@/lib/customsExchangeRate";

export const maxDuration = 60;

const TIMEZONE = "Asia/Colombo";

function localDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}

type CacheRow = {
  jpy_rate: number | null;
  effective_from: string | null;
  effective_to: string | null;
  pdf_url: string | null;
  fetched_at: string | null;
};

async function fetchLive() {
  const { pdfUrl } = await findLatestExchangeRatePdf();
  const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(20_000) });
  if (!pdfRes.ok) throw new Error(`PDF download failed (${pdfRes.status})`);
  const pdfBase64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64");
  const extraction = await extractJpyRateFromPdf(pdfBase64);
  return { ...extraction, pdfUrl };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";

  const { data: cached } = await supabase
    .from("customs_exchange_rate_cache")
    .select("*")
    .eq("id", 1)
    .single<CacheRow>();

  const cacheIsFresh =
    !force && !!cached?.fetched_at && localDateString(new Date(cached.fetched_at)) === localDateString(new Date());

  if (cacheIsFresh && cached) {
    return NextResponse.json({
      jpyRate: cached.jpy_rate,
      effectiveFrom: cached.effective_from,
      effectiveTo: cached.effective_to,
      pdfUrl: cached.pdf_url,
      fetchedAt: cached.fetched_at,
      cached: true,
    });
  }

  try {
    const fresh = await fetchLive();
    const fetchedAt = new Date().toISOString();

    await supabase
      .from("customs_exchange_rate_cache")
      .update({
        jpy_rate: fresh.jpyRate,
        effective_from: fresh.effectiveFrom,
        effective_to: fresh.effectiveTo,
        pdf_url: fresh.pdfUrl,
        fetched_at: fetchedAt,
      })
      .eq("id", 1);

    return NextResponse.json({ ...fresh, fetchedAt, cached: false });
  } catch (err) {
    // Live refresh failed — fall back to whatever's cached, even if stale, rather than a hard error.
    if (cached?.fetched_at) {
      return NextResponse.json({
        jpyRate: cached.jpy_rate,
        effectiveFrom: cached.effective_from,
        effectiveTo: cached.effective_to,
        pdfUrl: cached.pdf_url,
        fetchedAt: cached.fetched_at,
        cached: true,
        stale: true,
        error: err instanceof Error ? err.message : "Live refresh failed.",
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch the exchange rate." },
      { status: 502 },
    );
  }
}
