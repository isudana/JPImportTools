export type ChassisYearRange = {
  id: string;
  chassis_code: string;
  year: number;
  range_start: number;
  range_end: number;
  makes: string;
  notes: string | null;
};

export type VehicleReferencePrice = {
  id: string;
  name: string;
  model_code: string | null;
  display_name: string | null;
  grade: string | null;
  capacity: number;
  fuel: string;
  website_value_jpy: number;
  shipping_insurance_jpy: number;
  cif_jpy: number;
  updated_at: string;
};

export type AppSettings = {
  id: number;
  default_lc_rate: number;
  default_tt_rate: number;
  default_customs_rate: number;
  updated_at: string;
};
