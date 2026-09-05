const EXCHANGE_RATES_PAGE = "https://www.customs.gov.lk/exchange-rates/";

export type LatestExchangeRatePdf = { pdfUrl: string; listedDate: string };

/**
 * The page lists PDFs as "Effective from DD.MM.YYYY" links inside a table plugin's
 * data-original-value attribute. Filenames themselves aren't reliably date-ordered
 * (mixed DDMMYYYY/YYYYMMDD naming), so we parse the displayed dates instead and
 * sort those ourselves rather than trusting page/file order.
 */
export async function findLatestExchangeRatePdf(): Promise<LatestExchangeRatePdf> {
  const res = await fetch(EXCHANGE_RATES_PAGE, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Exchange rates page request failed (${res.status})`);
  const html = await res.text();

  const pattern = /href=&quot;([^&]+\.pdf)&quot;[^>]*>Effective from (\d{2})\.(\d{2})\.(\d{4})/gi;
  const seen = new Map<string, string>();
  for (const match of html.matchAll(pattern)) {
    const [, url, dd, mm, yyyy] = match;
    seen.set(url, `${yyyy}-${mm}-${dd}`);
  }
  if (seen.size === 0) throw new Error("Could not find any exchange rate PDF links on the page.");

  const [pdfUrl, listedDate] = [...seen.entries()].sort((a, b) => b[1].localeCompare(a[1]))[0];
  return { pdfUrl, listedDate };
}

export type ExchangeRateExtraction = {
  jpyRate: number;
  effectiveFrom: string;
  effectiveTo: string;
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    jpyRate: { type: "NUMBER" },
    effectiveFrom: { type: "STRING" },
    effectiveTo: { type: "STRING" },
  },
  required: ["jpyRate", "effectiveFrom", "effectiveTo"],
};

const PROMPT = `This is a Sri Lanka Customs weekly "Rates of Exchange" gazette notification (Customs Ordinance Chapter 235). Page 2 has a "Schedule" table titled "Rates of Exchange Effective From <date> to <date>", listing Country/Currency/Currency Code/Rate of Exchange (Rs.) for each currency.

Find the row for Japan / Japanese Yen (currency code JPY) and extract:
- jpyRate: the exact "Rate of Exchange (Rs.)" number for JPY, as a plain number (no commas).
- effectiveFrom / effectiveTo: the two dates from the schedule's "Effective From ... to ..." heading, in DD.MM.YYYY format exactly as printed.`;

export async function extractJpyRateFromPdf(pdfBase64: string): Promise<ExchangeRateExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: PROMPT }, { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: { thinkingBudget: 1024 },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );

  if (!res.ok) throw new Error(`Gemini request failed: ${await res.text()}`);

  const result = await res.json();
  const rawText = result.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!rawText) throw new Error("Gemini returned no data for this PDF.");

  const parsed = JSON.parse(rawText) as Partial<ExchangeRateExtraction>;
  if (typeof parsed.jpyRate !== "number" || !parsed.effectiveFrom || !parsed.effectiveTo) {
    throw new Error("Gemini's response was missing required fields.");
  }
  return { jpyRate: parsed.jpyRate, effectiveFrom: parsed.effectiveFrom, effectiveTo: parsed.effectiveTo };
}

export { EXCHANGE_RATES_PAGE };
