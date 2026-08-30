// FOB (with taxes) -> ex-tax FOB -> depreciated FOB, matching vehicle_reference_prices.cif_jpy's derivation.
export function depreciatedFob(websiteValueJpy: number): number {
  return Math.round((((websiteValueJpy * 100) / 110) * 0.85) * 100) / 100;
}
