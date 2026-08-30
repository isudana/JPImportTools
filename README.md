# JP ImportTools

A utility toolkit for car importers — accessible from anywhere, deployed on Vercel, backed by Supabase. Starts with a **Grade Search** utility: quick links to each manufacturer's official chassis-number-to-grade lookup portal.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project (free tier is fine).
2. Open **SQL Editor**, paste in the full contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `chassis_year_ranges` reference table (used by YOM Lookup), the `vehicle_reference_prices` table (used by the Tax Calculator and Quotation Generator), and the `app_settings` singleton row (default exchange rates), seeded with data. Safe to re-run any time — it drops and recreates all three.
3. Go to **Authentication → Providers** and make sure Email is enabled. Under **Authentication → Settings**, decide whether to allow public sign-ups, or add users manually from the dashboard (**Authentication → Users → Add user**) if you want to control who has access.
4. Go to **Project Settings → API** and copy the **Project URL** and **anon public** key.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with the two values from step 1. It's git-ignored, so they won't be committed.

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a user you created in Supabase.

## 4. Utilities

- **Grade Search** (`/grade-search`) — links to the official manufacturer grade-lookup portals for Toyota, Honda, Mazda, Suzuki, Mitsubishi, and Nissan.
- **YOM Lookup** (`/yom-lookup`) — enter a chassis code + serial number to get the vehicle's manufacture year and import eligibility (2024+), backed by the `chassis_year_ranges` table from `supabase/schema.sql`.
- **Vehicle Tax Calculator** (`/tax-calculator`) — estimates Sri Lanka Customs duty (CID, SUR, XID, VAT, VEL, LXT, SSCL) from buying price, shipping/handling/insurance, engine capacity/fuel, and exchange rate. Customs CIF is always the higher of the invoiced cost or the Yellow Book reference price for the matched model (from the `vehicle_reference_prices` table), shown explicitly so it's clear which basis was used.
- **Quotation Generator** (`/quotation`) — builds a cost quotation for a vehicle purchase: vehicle info (name/grade, capacity, fuel, YOM, colour, auction grade), Japan-side costs (buying price, exporter/importer shipping & handling), and LKR-side costs (LC and TT values converted at their own rates, Bank LC Charges, Clearing Charges, Importer Fee, Tax Amount) summed into a Total Quotation Amount. Selecting a vehicle auto-fills capacity/fuel, LC Value (its Depreciated FOB), Tax Amount (from its Yellow Book CIF), and Exporter Shipping & Handling (its Exporter Base Price + 10% of Buying Price); TT Value auto-fills as Total Cost in Japan minus LC Value. All auto-filled fields stay editable, and recompute live as Buying Price/LC Value change. LC/TT/Customs rates default from Settings and are all shown on the generated quotation. A "Download PDF" button on the generated quotation opens the browser's print dialog (choose "Save as PDF") with a print-only layout — the form and nav bar are hidden, only the quotation prints.
- **Settings** (`/settings`) — add, edit, and delete the vehicle reference prices used by the Tax Calculator's Yellow Book lookup and the Quotation Generator's auto-fill (CIF derived automatically: `CIF = (Website Value × 100/110) × 0.85 + Shipping & Insurance`; Exporter Base Price is optional — leave blank if unknown), plus default LC/TT/Customs exchange rates used to prefill the Quotation Generator.
- **Resources** (`/resources`) — links for sourcing, shipping, exchange rates, and vehicle history (auction sites, shipping schedules, Bank of Ceylon / Sri Lanka Customs rate pages, Japan vehicle history check).

More utilities will be added under `src/app/(app)/`.

## 5. Deploy so it's reachable from anywhere

1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), sign up, and "Import Project" from that repo.
3. Add the same two environment variables under **Settings → Environment Variables**.
4. Deploy. Vercel gives you a public HTTPS URL you can open from any device, anywhere.
