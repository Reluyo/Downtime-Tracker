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

## Status

Scaffold only. Auth (Supabase email/password) and the Supabase client are
wired and verified. The admin feature areas — downtime history, equipment,
reason codes, app config, and reporting — are stubbed on the dashboard and
will be implemented next.
