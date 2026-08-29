# ImportDrive

A utility toolkit for car importers — accessible from anywhere, deployed on Vercel, backed by Supabase. Starts with a **Grade Search** utility: quick links to each manufacturer's official chassis-number-to-grade lookup portal.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project (free tier is fine).
2. Open **SQL Editor**, paste in the full contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `chassis_year_ranges` reference table (used by YOM Lookup) and seeds it with the JAMA chassis-code/serial-number data. Safe to re-run any time.
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

More utilities will be added under `src/app/(app)/`.

## 5. Deploy so it's reachable from anywhere

1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), sign up, and "Import Project" from that repo.
3. Add the same two environment variables under **Settings → Environment Variables**.
4. Deploy. Vercel gives you a public HTTPS URL you can open from any device, anywhere.
