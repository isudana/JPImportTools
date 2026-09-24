import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshBocRate, refreshCbslHistory } from "@/lib/rateHistory";

export const maxDuration = 60;

// Called once a day by a Supabase pg_cron job (see supabase/schema.sql), so the rate history has
// a row for every day even when nobody opens the app. There's no user session here, so it's
// authenticated with a shared secret instead and writes with the service-role client.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [boc, cbsl] = await Promise.allSettled([refreshBocRate(supabase), refreshCbslHistory(supabase)]);
  const summary = {
    boc: boc.status === "fulfilled" ? { jpyRate: boc.value.jpyRate, asAt: boc.value.asAt } : { error: String(boc.reason) },
    cbsl: cbsl.status === "fulfilled" ? { rows: cbsl.value } : { error: String(cbsl.reason) },
  };

  const ok = boc.status === "fulfilled" && cbsl.status === "fulfilled";
  return NextResponse.json(summary, { status: ok ? 200 : 502 });
}
