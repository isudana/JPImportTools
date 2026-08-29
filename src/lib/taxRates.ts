export type FuelCategory = "Petrol" | "Hybrid" | "Series_Hybrid";

export const CID_RATE = 0.3;
export const SUR_RATE = 0.5;
export const VAT_RATE = 0.18;
export const SSCL_RATE = 0.025;
export const VEL_AMOUNT = 15000;

// Per-cc Excise Duty (XID) bands. capacity is engine cc for Petrol/Hybrid.
// "flat" bands ignore capacity and charge a fixed amount instead.
const PETROL_XID_BANDS: { max: number; ratePerCc: number }[] = [
  { max: 1000, ratePerCc: 2450 },
  { max: 1300, ratePerCc: 3850 },
  { max: 1500, ratePerCc: 4450 },
  { max: 1600, ratePerCc: 5150 },
  { max: 1800, ratePerCc: 6400 },
  { max: 2000, ratePerCc: 7700 },
  { max: 2500, ratePerCc: 8450 },
  { max: 2750, ratePerCc: 9650 },
  { max: 3000, ratePerCc: 10850 },
  { max: 4000, ratePerCc: 12050 },
  { max: Infinity, ratePerCc: 13300 },
];
const PETROL_UNDER_1000_FLOOR = 1992000;

const HYBRID_XID_BANDS: { max: number; ratePerCc: number }[] = [
  { max: 1300, ratePerCc: 2750 },
  { max: 1500, ratePerCc: 3450 },
  { max: 1600, ratePerCc: 4800 },
  { max: 1800, ratePerCc: 6300 },
  { max: 2000, ratePerCc: 6900 },
  { max: 2500, ratePerCc: 7250 },
  { max: 2750, ratePerCc: 8450 },
  { max: 3000, ratePerCc: 9650 },
  { max: 4000, ratePerCc: 10850 },
  { max: Infinity, ratePerCc: 12050 },
];
const HYBRID_UNDER_1000_FLAT = 1810900;

// Series (range-extender) hybrids are banded by motor power in kW, not engine cc,
// and the rate depends on whether the vehicle is under 1 year old.
const SERIES_HYBRID_XID_BANDS: { max: number; underOneYear: number; overOneYear: number }[] = [
  { max: 50, underOneYear: 30770, overOneYear: 43440 },
  { max: 100, underOneYear: 40970, overOneYear: 43440 },
  { max: 200, underOneYear: 41630, overOneYear: 63420 },
  { max: Infinity, underOneYear: 111090, overOneYear: 139440 },
];

export function calculateXid(fuel: FuelCategory, capacity: number, yomWithinOneYear: boolean): number {
  if (fuel === "Series_Hybrid") {
    const band = SERIES_HYBRID_XID_BANDS.find((b) => capacity < b.max)!;
    return yomWithinOneYear ? band.underOneYear : band.overOneYear;
  }
  if (fuel === "Hybrid") {
    if (capacity < 1000) return HYBRID_UNDER_1000_FLAT;
    const band = HYBRID_XID_BANDS.find((b) => capacity < b.max)!;
    return band.ratePerCc * capacity;
  }
  if (capacity < 1000) return Math.max(PETROL_UNDER_1000_FLOOR, capacity * PETROL_XID_BANDS[0].ratePerCc);
  const band = PETROL_XID_BANDS.find((b) => capacity < b.max)!;
  return band.ratePerCc * capacity;
}

export function calculateLxt(fuel: FuelCategory, cif: number): number {
  const threshold = fuel === "Hybrid" ? 5_500_000 : fuel === "Series_Hybrid" ? 6_000_000 : 5_000_000;
  const excess = Math.max(0, cif - threshold);
  const rate = fuel === "Hybrid" ? 0.8 : 1;
  return excess * rate;
}

export type TaxBreakdown = {
  cif: number;
  cid: number;
  sur: number;
  xid: number;
  vat: number;
  vel: number;
  lxt: number;
  sscl: number;
  total: number;
};

export function calculateTax(fuel: FuelCategory, capacity: number, cif: number, yomWithinOneYear: boolean): TaxBreakdown {
  const cid = cif * CID_RATE;
  const sur = cid * SUR_RATE;
  const xid = calculateXid(fuel, capacity, yomWithinOneYear);
  const dutyBase = cif * 1.1 + cid + sur + xid;
  const vat = dutyBase * VAT_RATE;
  const vel = VEL_AMOUNT;
  const lxt = calculateLxt(fuel, cif);
  const sscl = dutyBase * SSCL_RATE;
  const total = cid + sur + xid + vat + vel + lxt + sscl;
  return { cif, cid, sur, xid, vat, vel, lxt, sscl, total };
}
