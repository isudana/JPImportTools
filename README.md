# JP Import Tools

A utility toolkit for Japanese used car importers — accessible from anywhere, deployed on Vercel, backed by Supabase. Starts with a **Grade Search** utility: quick links to each manufacturer's official chassis-number-to-grade lookup portal.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project (free tier is fine).
2. Open **SQL Editor**, paste in the full contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `chassis_year_ranges` reference table (used by YOM Lookup), the `vehicle_reference_prices` table (used by the Tax Calculator and Quotation Generator), the `app_settings` singleton row (default exchange rates), and the `profiles`/role infrastructure (see **Users & roles** below), seeded with data. Safe to re-run any time — `profiles` is guarded and never dropped (so re-running never wipes accounts or roles), everything else is dropped and recreated.
3. Go to **Authentication → Providers** and make sure Email is enabled. Under **Authentication → Settings**, decide whether to allow public sign-ups, or add the first user manually from the dashboard (**Authentication → Users → Add user**) — that first account automatically becomes an Admin.
4. Go to **Project Settings → API** and copy the **Project URL**, **anon public** key, and **service_role** key (Settings → API → Project API keys).

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with the three values from step 1. `SUPABASE_SERVICE_ROLE_KEY` is server-only (no `NEXT_PUBLIC_` prefix, so it's never sent to the browser) — it's what lets Admins create/delete users from Settings. The file is git-ignored, so none of this gets committed.

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
- **Settings** (`/settings`) — Admins can add, edit, and delete the vehicle reference prices used by the Tax Calculator's Yellow Book lookup and the Quotation Generator's auto-fill (CIF derived automatically: `CIF = (Website Value × 100/110) × 0.85 + Shipping & Insurance`; Exporter Base Price is optional — leave blank if unknown), set the default LC/TT/Customs exchange rates, and add/remove users. Everyone else sees the same data read-only.
- **Resources** (`/resources`) — links for sourcing, shipping, exchange rates, and vehicle history (auction sites, shipping schedules, Bank of Ceylon / Sri Lanka Customs rate pages, Japan vehicle history check).
- **Auction Sheet Decoder** (`/auction-sheet-decoder`) — reference legend plus an interactive lookup for the grade and damage codes on a Japanese auction sheet (overall grade, interior grade, exterior damage letter + severity, equipment abbreviations). Static reference data, no database involved — codes follow the common convention across most auction houses, with a note that exact codes can vary slightly by auction.

More utilities will be added under `src/app/(app)/`.

## 5. Users & roles

Every account has a role, `ADMIN` or `USER` (read-only), stored in a `profiles` table auto-created for each `auth.users` row.

- The very first account ever created (typically added via the Supabase dashboard per step 3 above) automatically becomes `ADMIN` — there's always at least one admin on a fresh project.
- From then on, **Settings → Users** is where Admins add or remove accounts and change roles. Adding a user there sets a temporary password and role directly (via `/api/users`, which uses the service-role key server-side — regular users can't call it).
- `USER` accounts can use every utility, but can't add/edit/delete vehicle reference prices, change the default exchange rates, or manage other users — Settings renders those sections read-only for them. This is enforced both in the UI and at the database level (Postgres RLS policies check `current_user_role() = 'ADMIN'`), so it holds even if someone bypasses the UI.

## 6. Deploy so it's reachable from anywhere

1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), sign up, and "Import Project" from that repo.
3. Add the same three environment variables under **Settings → Environment Variables**.
4. Deploy. Vercel gives you a public HTTPS URL you can open from any device, anywhere.
