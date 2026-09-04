import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchRoroSchedule, RORO_SOURCE_URL } from "@/lib/roroSchedule";

export const maxDuration = 30;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sailings;
  try {
    sailings = await fetchRoroSchedule();
  } catch {
    return NextResponse.json(
      { error: "Could not fetch the shipping schedule right now — please try again." },
      { status: 502 },
    );
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = sailings
    .filter((s) => !s.hambantotaISO || s.hambantotaISO >= todayISO)
    .sort((a, b) => (a.hambantotaISO ?? "9999").localeCompare(b.hambantotaISO ?? "9999"));

  return NextResponse.json({
    sailings: upcoming,
    sourceUrl: RORO_SOURCE_URL,
    fetchedAt: new Date().toISOString(),
  });
}
