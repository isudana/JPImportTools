"use client";

import { useState } from "react";

type LegendEntry = { code: string; label: string; description: string };

// Common convention across most Japanese auction houses (USS, TAA, JU, HAA, etc.). Exact codes
// can vary slightly by auction — when in doubt, check that auction's own printed legend.
const OVERALL_GRADE: LegendEntry[] = [
  { code: "6", label: "Unused / New", description: "Essentially zero-mileage or a dealer demo car." },
  { code: "S", label: "Outstanding", description: "Top-tier condition, on par with grade 6 — no notable defects." },
  { code: "5", label: "Excellent", description: "Like new, no notable defects." },
  { code: "4.5", label: "Very Good", description: "Very minor wear only." },
  { code: "4", label: "Good", description: "Minor scratches/wear, no major issues." },
  { code: "3.5", label: "Average", description: "Noticeable wear, small dents/scratches." },
  { code: "3", label: "Below Average", description: "More wear, moderate defects — may need reconditioning." },
  { code: "2", label: "Poor", description: "Significant wear/damage, expect notable repair costs." },
  { code: "1", label: "Very Poor", description: "Heavy damage or wear." },
  {
    code: "R",
    label: "Repaired",
    description: "Has accident/repair history (frame or panel work). Usually shown with a number, e.g. R3.5.",
  },
  { code: "RA", label: "Repaired (Major)", description: "More extensive accident/repair history than plain R." },
  { code: "0", label: "Not Graded", description: "No inspection grade assigned." },
];

const INTERIOR_GRADE: LegendEntry[] = [
  { code: "A", label: "Clean", description: "Like new." },
  { code: "B", label: "Normal", description: "Minor dirt/wear from normal use." },
  { code: "C", label: "Dirty", description: "Noticeable dirt, stains, or odor (e.g. smoke smell)." },
  { code: "D", label: "Heavily Soiled", description: "Heavily soiled or damaged interior." },
];

const EXTERIOR_DAMAGE: LegendEntry[] = [
  { code: "A", label: "Scratch", description: "Surface scratch, no dent." },
  { code: "U", label: "Dent", description: "Dent, no scratch." },
  { code: "W", label: "Dent + Scratch", description: "Combined dent and scratch in one spot." },
  { code: "S", label: "Rust", description: "Rust spot." },
  { code: "C", label: "Corrosion / Paint Peel", description: "Corrosion or peeling paint." },
  { code: "X", label: "Replaced Panel", description: "Panel has been replaced (交換)." },
  { code: "XX", label: "Replaced & Welded", description: "Panel replaced with welding — major structural repair." },
  { code: "E", label: "Minor Repair", description: "Small dent/scratch that's already been repaired." },
  { code: "P", label: "Repainted", description: "Panel has been repainted." },
];

const SEVERITY: LegendEntry[] = [
  { code: "1", label: "Small", description: "Small — roughly palm-sized or less." },
  { code: "2", label: "Medium", description: "Medium sized." },
  { code: "3", label: "Large", description: "Large, or multiple in the same area." },
];

const EQUIPMENT: LegendEntry[] = [
  { code: "AW", label: "Alloy Wheels", description: "" },
  { code: "PS", label: "Power Steering", description: "" },
  { code: "PW", label: "Power Windows", description: "" },
  { code: "AC", label: "Air Conditioning", description: "" },
  { code: "TV", label: "TV / Navigation", description: "" },
  { code: "SR", label: "Sunroof", description: "" },
];

function decodeCode(raw: string): { code: string; category: string; label: string; description: string } | null {
  const code = raw.trim().toUpperCase();
  if (!code) return null;

  const overall = OVERALL_GRADE.find((g) => g.code === code);
  if (overall) return { code, category: "Overall Grade", label: overall.label, description: overall.description };

  const interior = INTERIOR_GRADE.find((g) => g.code === code);
  if (interior) return { code, category: "Interior Grade", label: interior.label, description: interior.description };

  const equipment = EQUIPMENT.find((g) => g.code === code);
  if (equipment) return { code, category: "Equipment", label: equipment.label, description: equipment.description };

  // Exterior damage codes are a letter (or XX) optionally followed by a severity digit, e.g. "A2", "XX".
  const match = code.match(/^(XX|[AUWSCXEP])(\d)?$/);
  if (match) {
    const [, letter, digit] = match;
    const damage = EXTERIOR_DAMAGE.find((g) => g.code === letter);
    if (damage) {
      const severity = digit ? SEVERITY.find((g) => g.code === digit) : null;
      return {
        code,
        category: "Exterior Damage",
        label: severity ? `${damage.label} (${severity.label})` : damage.label,
        description: severity ? `${damage.description} ${severity.description}` : damage.description,
      };
    }
  }

  return null;
}

function LegendTable({ title, rows }: { title: string; rows: LegendEntry[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <table className="mt-3 min-w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b border-gray-100 last:border-0">
              <td className="whitespace-nowrap py-1.5 pr-3 font-mono font-medium text-red-700">{r.code}</td>
              <td className="whitespace-nowrap py-1.5 pr-3 font-medium text-gray-900">{r.label}</td>
              <td className="py-1.5 text-gray-500">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuctionSheetDecoderPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<ReturnType<typeof decodeCode>[] | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const codes = input.split(/[\s,]+/).filter(Boolean);
    setResults(codes.map(decodeCode));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Auction Sheet Decoder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Decode the grade and damage codes found on a Japanese auction sheet. Codes follow the common
          convention used across most auction houses (USS, TAA, JU, HAA, etc.) — always check the specific
          auction&apos;s own legend if a code looks unfamiliar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="block">
          <span className="block text-xs font-medium text-gray-500">Codes from the sheet</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 4.5 A2 U1 XX C"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Decode
        </button>
      </form>

      {results && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">Results</p>
          <dl className="mt-3 space-y-3 text-sm">
            {results.map((r, i) =>
              r ? (
                <div key={i}>
                  <dt className="font-mono font-medium text-red-700">
                    {r.code} <span className="font-sans text-xs text-gray-400">({r.category})</span>
                  </dt>
                  <dd className="text-gray-600">
                    <span className="font-medium text-gray-900">{r.label}.</span> {r.description}
                  </dd>
                </div>
              ) : (
                <div key={i}>
                  <dt className="font-mono font-medium text-gray-400">—</dt>
                  <dd className="text-gray-500">Not recognized — check the auction&apos;s own legend.</dd>
                </div>
              ),
            )}
          </dl>
        </div>
      )}

      <LegendTable title="Overall Grade" rows={OVERALL_GRADE} />
      <LegendTable title="Interior Grade" rows={INTERIOR_GRADE} />
      <LegendTable title="Exterior Damage (letter + severity, e.g. A2)" rows={EXTERIOR_DAMAGE} />
      <LegendTable title="Severity Suffix" rows={SEVERITY} />
      <LegendTable title="Equipment Abbreviations" rows={EQUIPMENT} />
    </div>
  );
}
