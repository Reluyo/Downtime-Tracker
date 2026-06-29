# PRSA Downtime — Control Center

Admin web app (React + Vite + TypeScript) for the PRSA Downtime Tracker.
Connects to the shared Supabase backend.

## Setup

```bash
cd control-center
cp .env.example .env   # then fill in your Supabase URL + publishable key
npm install
npm run dev            # http://localhost:5173
```

Use the **publishable** (anon) key only — never the secret/service key.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Preview the production build |

## Deploy (Vercel)

```bash
npx vercel
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment
variables.

## Features

- **History** — filter downtime events by date range / equipment / reason;
  edit or delete individual events.
- **Equipment** — add, rename, reorder, and (de)activate equipment.
- **Reason Codes** — per-equipment reason management with a `requires_note`
  toggle and (de)activation.
- **Configuration** — alert threshold + repeat interval per line.
- **Reports** — total downtime by equipment, by reason code, and by day for a
  date range.

Admin access is via Supabase email/password auth. All data access is governed
by the RLS policies in `supabase/migrations/001_initial_schema.sql`.

> Note: the app builds and type-checks cleanly here, but the live data flows
> (which require an authenticated admin session) haven't been exercised against
> Supabase from this environment — sign in and click through to confirm.
