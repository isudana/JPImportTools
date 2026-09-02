import type { ChassisYearRange } from "@/lib/types";

export type YomResult = {
  status: "MATCH" | "PROJECTED_2026" | "BEFORE_2024" | "GAP" | "NOT_FOUND";
  year: number | null;
  importable: boolean;
  makes: string | null;
  notes: string | null;
  message: string;
};

export function evaluateYom(rows: ChassisYearRange[], serial: number): YomResult {
  if (rows.length === 0) {
    return {
      status: "NOT_FOUND",
      year: null,
      importable: false,
      makes: null,
      notes: null,
      message: "Chassis code not recognized.",
    };
  }

  const containing = rows.find((r) => serial >= r.range_start && serial <= r.range_end);
  if (containing) {
    const importable = containing.year >= 2024;
    return {
      status: "MATCH",
      year: containing.year,
      importable,
      makes: containing.makes,
      notes: containing.notes,
      message: importable
        ? `This chassis was manufactured in ${containing.year}.`
        : `This chassis was manufactured in ${containing.year} — predates 2024, cannot import.`,
    };
  }

  const rows2025 = rows.filter((r) => r.year === 2025);
  if (rows2025.length > 0) {
    const max2025 = Math.max(...rows2025.map((r) => r.range_end));
    if (serial > max2025) {
      const makes = Array.from(new Set(rows2025.map((r) => r.makes))).join(", ");
      return {
        status: "PROJECTED_2026",
        year: 2026,
        importable: true,
        makes,
        notes: null,
        message: "This serial is above the highest 2025 range for this model — projected as a 2026 vehicle.",
      };
    }
  }

  const earlyRows = rows.filter((r) => r.year <= 2024);
  if (earlyRows.length > 0) {
    const minEarly = Math.min(...earlyRows.map((r) => r.range_start));
    if (serial < minEarly) {
      return {
        status: "BEFORE_2024",
        year: null,
        importable: false,
        makes: null,
        notes: null,
        message: "This serial is below the lowest listed range for this model — predates 2024, cannot import.",
      };
    }
  }

  return {
    status: "GAP",
    year: null,
    importable: false,
    makes: null,
    notes: null,
    message: "Unrecognized serial — falls in a gap in the available data for this model.",
  };
}
