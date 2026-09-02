import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROMPT = `You are an expert Japanese used-vehicle auction inspector, helping a Sri Lankan car importer understand an auction sheet (e.g. from USS, TAA, JAA, or similar auction houses) before they bid.

Read the attached auction sheet image, then write a detailed explanation in plain English covering:
- Vehicle identification: maker, model, chassis/model code, year, and any other identifying details visible.
- Overall auction grade (e.g. R, 4, 4.5, 5) and what it means in practice.
- Exterior grade and interior grade separately, if both are shown.
- Mileage, and whether the odometer has any warning mark (e.g. a mark indicating the reading may not be reliable).
- Equipment/options codes shown (e.g. AC, PS, PW, AW, SR, TV, NAV) translated into plain English.
- A walkthrough of the damage/condition diagram: for each marked position on the body diagram, state the panel/area and what the code means (e.g. scratch, dent, rust, repaint, replacement), in plain language a non-Japanese-speaking buyer can follow.
- Any handwritten auctioneer comments or remarks, translated and explained.
- A short overall condition summary and any red flags an importer should be cautious about before bidding.

If any section isn't present or legible on the sheet, say so briefly rather than guessing. Format the response as clear sections with short paragraphs or bullet points, not a raw data dump.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const { imageBase64, mimeType } = (await request.json()) as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "Missing image data." }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
      }),
    },
  );

  if (!geminiResponse.ok) {
    const detail = await geminiResponse.text();
    return NextResponse.json(
      { error: `Gemini request failed: ${detail}` },
      { status: 502 },
    );
  }

  const result = await geminiResponse.json();
  const explanation = result.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!explanation) {
    return NextResponse.json(
      { error: "Gemini returned no explanation for this image." },
      { status: 502 },
    );
  }

  return NextResponse.json({ explanation });
}
