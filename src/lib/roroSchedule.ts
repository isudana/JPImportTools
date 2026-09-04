import { load } from "cheerio";

export type RoroPortDate = { port: string; date: string; cutoff: string | null };

export type RoroSailing = {
  company: string;
  shipName: string;
  voyage: string;
  japanPorts: RoroPortDate[];
  hambantotaDate: string;
  hambantotaISO: string | null;
};

const SOURCE_URL = "https://autocj.co.jp/japan_shipping?dest=8";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** "Jul 24" (no year on the source site) -> ISO date, rolling into next year if it looks like it's already long past. */
function inferISODate(monthDay: string, reference: Date): string | null {
  if (!monthDay || monthDay === "-") return null;
  const match = monthDay.trim().match(/^([A-Za-z]{3,})\s+(\d{1,2})$/);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  const day = Number(match[2]);
  if (month == null || !Number.isFinite(day)) return null;

  let year = reference.getUTCFullYear();
  let candidate = Date.UTC(year, month, day);
  const diffDays = (candidate - reference.getTime()) / 86_400_000;
  if (diffDays < -60) {
    year += 1;
    candidate = Date.UTC(year, month, day);
  }
  return new Date(candidate).toISOString().slice(0, 10);
}

export function parseAutocjSchedule(html: string, reference: Date = new Date()): RoroSailing[] {
  const $ = load(html);
  const tables = $("table");
  if (tables.length < 3) return [];

  const vesselTable = $(tables[0]);
  const leaveTable = $(tables[1]);
  const arrivalsTable = $(tables[2]);

  const vesselRows = vesselTable.find("tbody tr").toArray();
  const leaveRows = leaveTable.find("tbody tr").toArray();
  const arrivalRows = arrivalsTable.find("tbody tr").toArray();

  const leavePorts = leaveTable
    .find("thead th")
    .toArray()
    .map((th) => $(th).text().replace(/\s+/g, " ").trim())
    .filter((t) => t && t !== "LEAVE");

  const arrivalPorts = arrivalsTable
    .find("thead th")
    .toArray()
    .map((th) => $(th).text().replace(/\s+/g, " ").trim())
    .filter((t) => t && t !== "ARRIVALS");

  const hambantotaIdx = arrivalPorts.findIndex((p) => p.toLowerCase() === "hambantota");
  if (hambantotaIdx === -1) return [];

  const rowCount = Math.min(vesselRows.length, leaveRows.length, arrivalRows.length);
  const sailings: RoroSailing[] = [];

  for (let i = 0; i < rowCount; i++) {
    const [company, shipName, voyage] = $(vesselRows[i])
      .find("td")
      .toArray()
      .map((td) => $(td).text().replace(/\s+/g, " ").trim());
    if (!shipName) continue;

    const hambantotaDate = $(arrivalRows[i])
      .find("td")
      .eq(hambantotaIdx)
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (!hambantotaDate || hambantotaDate === "-") continue;

    const japanPorts: RoroPortDate[] = [];
    $(leaveRows[i])
      .find("td")
      .each((idx, cell) => {
        const $cell = $(cell);
        const cutoffText = $cell.find("span").text().replace(/\s+/g, " ").trim();
        const cutoffMatch = cutoffText.match(/Cut:\s*(.+)/);
        const clone = $cell.clone();
        clone.find("span").remove();
        const dateText = clone.text().replace(/\s+/g, " ").trim();
        if (!dateText || dateText === "-") return;
        japanPorts.push({
          port: leavePorts[idx] ?? `Port ${idx + 1}`,
          date: dateText,
          cutoff: cutoffMatch ? cutoffMatch[1].trim() : null,
        });
      });

    sailings.push({
      company: company ?? "",
      shipName,
      voyage: voyage ?? "",
      japanPorts,
      hambantotaDate,
      hambantotaISO: inferISODate(hambantotaDate, reference),
    });
  }

  return sailings;
}

export async function fetchRoroSchedule(): Promise<RoroSailing[]> {
  const res = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`AutoCJ request failed (${res.status})`);
  const html = await res.text();
  return parseAutocjSchedule(html);
}

export { SOURCE_URL as RORO_SOURCE_URL };
