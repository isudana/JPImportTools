export type ChassisYearRange = {
  id: string;
  chassis_code: string;
  year: number;
  range_start: number;
  range_end: number;
  makes: string;
  notes: string | null;
};
