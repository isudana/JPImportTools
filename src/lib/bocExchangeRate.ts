const BOC_RATES_PAGE = "https://www.boc.lk/rates-tariff";

export type BocJpyRate = {
  // Telegraphic/PFCA/BFCA Transfers selling rate — what the bank charges an importer to remit JPY.
  jpyRate: number;
  asAt: string | null;
};

const stripTags = (html: string) => html.replace(/<[^>]+>/g, "").trim();

/**
 * The "exchange-rates" tab on the BOC Rates & Tariff page is a server-rendered table with columns
 * Currency | Currency Buying/Selling | Drafts Buying/Selling | Telegraphic Buying/Selling.
 */
export async function fetchBocJpyRate(): Promise<BocJpyRate> {
  const res = await fetch(BOC_RATES_PAGE, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`BOC rates page request failed (${res.status})`);
  const html = await res.text();

  const start = html.indexOf('id="exchange-rates"');
  if (start === -1) throw new Error("Could not find the exchange rates table on the BOC page.");
  const section = html.slice(start, html.indexOf("</table>", start));

  const asAtMatch = section.match(/as at:\s*(?:<b>)?\s*([^<]+)/i);
  const row = [...section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1])))
    .find((cells) => cells[0] === "JPY");
  if (!row || row.length < 7) throw new Error("Could not find the JPY row on the BOC page.");

  const jpyRate = Number(row[6].replace(/,/g, ""));
  if (!Number.isFinite(jpyRate) || jpyRate <= 0) throw new Error("BOC page has no JPY telegraphic selling rate.");
  return { jpyRate, asAt: asAtMatch?.[1].trim() || null };
}

// TT remittances are quoted at BOC's live rate plus a fixed margin.
export const TT_RATE_MARGIN = 0.05;

export function ttRateFromBoc(jpyRate: number): number {
  return Math.round((jpyRate + TT_RATE_MARGIN) * 10000) / 10000;
}

export { BOC_RATES_PAGE };
