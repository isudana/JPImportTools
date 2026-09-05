import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateYom, type YomResult } from "@/lib/yom";
import type { ChassisYearRange } from "@/lib/types";

export const maxDuration = 60;

const PROMPT = `You are an expert Japanese used-vehicle auction inspector, helping a Sri Lankan car importer understand an auction sheet (e.g. from USS, TAA, JAA, or similar auction houses) before they bid.

Read the attached auction sheet image and extract the following structured information.

1. Vehicle identification (vehicleInfo):
- model: the vehicle's model name (e.g. "Corolla Cross").
- grade: the vehicle's trim/grade name if shown separately from the overall auction grade (e.g. "Hybrid Z") — leave empty if not distinguishable from the overall grade.
- modelCode: the model/chassis code prefix (e.g. "MXAA54") if printed.
- yom: the year of manufacture as printed on the sheet, if shown.
- displacement: engine displacement/capacity as printed (e.g. "1500cc") — leave empty if not shown.
- drivetrain: exactly "2WD", "4WD", or "Unknown" if not determinable from the sheet.
- mileage: the odometer reading as printed, noting if there is a warning mark next to it indicating the reading may be unreliable.

2. Grades and diagram marks (grades):
- overallGrade: the overall auction grade (e.g. "4.5", "R", "5").
- interiorGrade: the interior grade if shown separately (e.g. "B", "C") — leave empty if not shown separately.
- marksSummary: a walkthrough of the damage/condition diagram — for each marked position on the body diagram, state the panel/area and what the code means (e.g. scratch, dent, rust, repaint, replacement), in plain language a non-Japanese-speaking buyer can follow. If no marks are shown, say so briefly.

3. Available options (availableOptions): Auction sheets print a list of equipment/option codes (e.g. AC, PS, PW, AW, SR, TV, NAV) and mark — usually by circling, or otherwise clearly indicating — only the ones actually fitted to this specific vehicle. Return ONLY the codes that are circled/marked as fitted, translated to plain English (e.g. "Sunroof", "Alloy Wheels"). Do NOT include codes that are printed but not circled/marked — an option that isn't marked is not present on this vehicle and should be omitted entirely, not listed as unavailable.

4. Highlights (highlights) — translate to English if present on the sheet; leave a field as an empty string if that section doesn't appear on this sheet (do not fabricate content):
- inspectorReport: the inspector's report/comment section.
- notes: any other notes or remarks section distinct from the inspector's report.
- salesPoints: any "sales points" or highlighted selling-points section.

5. explanation: A short overall condition summary and any red flags an importer should be cautious about before bidding, based on everything above. Keep this brief — the detailed information belongs in the structured fields above, not repeated here.

If any field isn't present or legible on the sheet, say so briefly in that field rather than guessing.

Also separately extract, exactly as printed on the sheet:
- The chassis/model code (the letters-and-digits prefix, e.g. "MXAA54") — leave empty if not legible.
- The chassis serial number (the digits after the chassis code, e.g. "2040000") — leave empty if not legible.
Do not guess the manufacture year yourself from the chassis number — that will be checked separately against reference data.

Finally, return an "annotations" array covering every piece of Japanese text or diagram mark on the sheet — the grade box, every equipment code, every mark on the damage diagram, every handwritten remark, and any other printed text. Do not skip, shorten, or summarize anything as "minor" — annotate everything that is written on the sheet. For each one, give:
- A single approximate point (x, y) marking roughly where it is on the image, as integers from 0 to 1000, where (0,0) is the top-left corner and (1000,1000) is the bottom-right corner of the whole image. This just needs to be close, not pixel-perfect — it will be shown as a small numbered marker pointing at the general area, not an exact outline.
- A full, complete English translation of the exact text or mark at that spot. Do not abbreviate, shorten, or paraphrase — translate everything that is written there, however long it is.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    chassisCode: { type: "STRING" },
    serialNumber: { type: "STRING" },
    vehicleInfo: {
      type: "OBJECT",
      properties: {
        model: { type: "STRING" },
        grade: { type: "STRING" },
        modelCode: { type: "STRING" },
        yom: { type: "STRING" },
        displacement: { type: "STRING" },
        drivetrain: { type: "STRING" },
        mileage: { type: "STRING" },
      },
    },
    grades: {
      type: "OBJECT",
      properties: {
        overallGrade: { type: "STRING" },
        interiorGrade: { type: "STRING" },
        marksSummary: { type: "STRING" },
      },
    },
    availableOptions: { type: "ARRAY", items: { type: "STRING" } },
    highlights: {
      type: "OBJECT",
      properties: {
        inspectorReport: { type: "STRING" },
        notes: { type: "STRING" },
        salesPoints: { type: "STRING" },
      },
    },
    explanation: { type: "STRING" },
    annotations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          x: { type: "INTEGER" },
          y: { type: "INTEGER" },
          translation: { type: "STRING" },
        },
        required: ["x", "y", "translation"],
      },
    },
  },
  required: ["explanation"],
};

type Annotation = { x: number; y: number; translation: string };

function sanitizeAnnotations(raw: unknown): Annotation[] {
  if (!Array.isArray(raw)) return [];
  const clamp = (n: unknown) => Math.max(0, Math.min(1000, Number(n)));
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const a = item as Record<string, unknown>;
      const x = clamp(a.x);
      const y = clamp(a.y);
      const translation = typeof a.translation === "string" ? a.translation.trim() : "";
      if (!translation || !Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y, translation };
    })
    .filter((a): a is Annotation => a !== null);
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type VehicleInfo = {
  model: string;
  grade: string;
  modelCode: string;
  yom: string;
  displacement: string;
  drivetrain: "2WD" | "4WD" | "Unknown";
  mileage: string;
};

function sanitizeVehicleInfo(raw: unknown): VehicleInfo {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const drivetrainRaw = str(v.drivetrain).toUpperCase();
  const drivetrain: VehicleInfo["drivetrain"] =
    drivetrainRaw === "4WD" ? "4WD" : drivetrainRaw === "2WD" ? "2WD" : "Unknown";
  return {
    model: str(v.model),
    grade: str(v.grade),
    modelCode: str(v.modelCode),
    yom: str(v.yom),
    displacement: str(v.displacement),
    drivetrain,
    mileage: str(v.mileage),
  };
}

type Grades = { overallGrade: string; interiorGrade: string; marksSummary: string };

function sanitizeGrades(raw: unknown): Grades {
  const g = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { overallGrade: str(g.overallGrade), interiorGrade: str(g.interiorGrade), marksSummary: str(g.marksSummary) };
}

type Highlights = { inspectorReport: string; notes: string; salesPoints: string };

function sanitizeHighlights(raw: unknown): Highlights {
  const h = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { inspectorReport: str(h.inspectorReport), notes: str(h.notes), salesPoints: str(h.salesPoints) };
}

function sanitizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => str(o)).filter(Boolean);
}

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

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(
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
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 1024 },
          },
        }),
        signal: AbortSignal.timeout(50_000),
      },
    );
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "Gemini took too long to respond (>50s). Try again, or use a smaller/clearer photo."
          : "Could not reach Gemini — please try again.",
      },
      { status: 504 },
    );
  }

  if (!geminiResponse.ok) {
    const detail = await geminiResponse.text();
    return NextResponse.json(
      { error: `Gemini request failed: ${detail}` },
      { status: 502 },
    );
  }

  const result = await geminiResponse.json();
  const rawText = result.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!rawText) {
    return NextResponse.json(
      { error: "Gemini returned no explanation for this image." },
      { status: 502 },
    );
  }

  let parsed: {
    chassisCode?: string;
    serialNumber?: string;
    explanation?: string;
    annotations?: unknown;
    vehicleInfo?: unknown;
    grades?: unknown;
    availableOptions?: unknown;
    highlights?: unknown;
  };
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: "Gemini returned a response that couldn't be parsed." },
      { status: 502 },
    );
  }

  if (!parsed.explanation) {
    return NextResponse.json(
      { error: "Gemini returned no explanation for this image." },
      { status: 502 },
    );
  }

  const chassisCode = parsed.chassisCode?.trim() || null;
  const serialDigits = parsed.serialNumber?.replace(/\D/g, "") || "";
  const serial = serialDigits ? Number(serialDigits) : null;

  let yom: YomResult | null = null;
  if (chassisCode && serial != null) {
    const { data } = await supabase
      .from("chassis_year_ranges")
      .select("*")
      .ilike("chassis_code", chassisCode);
    yom = evaluateYom((data ?? []) as ChassisYearRange[], serial);
  }

  return NextResponse.json({
    explanation: parsed.explanation,
    chassisCode,
    serialNumber: serial,
    yom,
    annotations: sanitizeAnnotations(parsed.annotations),
    vehicleInfo: sanitizeVehicleInfo(parsed.vehicleInfo),
    grades: sanitizeGrades(parsed.grades),
    availableOptions: sanitizeOptions(parsed.availableOptions),
    highlights: sanitizeHighlights(parsed.highlights),
  });
}
