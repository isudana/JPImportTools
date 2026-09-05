import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findLatestExchangeRatePdf, extractJpyRateFromPdf } from "@/lib/customsExchangeRate";

export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pdfUrl: string;
  try {
    ({ pdfUrl } = await findLatestExchangeRatePdf());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not find the latest exchange rate PDF." },
      { status: 502 },
    );
  }

  let pdfBase64: string;
  try {
    const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(20_000) });
    if (!pdfRes.ok) throw new Error(`PDF download failed (${pdfRes.status})`);
    const buffer = await pdfRes.arrayBuffer();
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not download the exchange rate PDF." },
      { status: 502 },
    );
  }

  try {
    const extraction = await extractJpyRateFromPdf(pdfBase64);
    return NextResponse.json({ ...extraction, pdfUrl, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not extract the JPY rate from the PDF." },
      { status: 502 },
    );
  }
}
