# Session Handoff — PRSA Downtime Tracker

## Project Overview

Manufacturing downtime tracking system for the **Piston Rod Sub Assembly 2 (PRSA 2)** line at Astemo. Two apps share a single Supabase backend:

- **Tablet App** (`/tablet`) — Flutter, operator-facing, deployed on Amazon Fire tablets
- **Control Center** (`/control-center`) — React/Vite/TypeScript, admin-facing

## Current State

### Branch
- **Working branch**: `claude/vigilant-curie-yv0pra` (based on `claude/epic-ptolemy-a5wa2o`)
- **Latest commits**:
  - `c75542b` — Generated Supabase types + typed client
  - `8615b88` — Rebrand UI to Astemo corporate palette on a dark theme

### Supabase Backend (fully provisioned)
- **Project ID**: `ktcdpogaxxmjdqhsmiev`
- **Project name**: Downtime Tracker
- **Schema**: 5 tables — `lines`, `equipment`, `downtime_reasons`, `downtime_events`, `app_config`
- **Seed data**: 1 line (PRSA 2), 7 equipment pieces, all reason codes per PRODUCT_SPEC.md, default app config
- **Auth**: Admin user `rolandoriveracruz@gmail.com` exists
- **RLS**: Anon can read config + insert/update events; authenticated can do everything

### Control Center (React)
- **All 5 pages implemented**: History, Equipment, Reason Codes, Configuration, Reports
- **API layer**: `src/lib/api.ts` — full CRUD for all entities via typed Supabase client
- **Astemo rebrand complete**: dark theme with Astemo Red (#B6001A), corporate logo on all screens
- **Auth**: Login page with email/password via Supabase Auth
- **Types**: Generated Supabase types in `src/types/database.types.ts`, manual types in `src/types.ts`
- **Env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (in `.env`, gitignored)

### Tablet App (Flutter)
- **Screen flow implemented**: Home → Confirmation → Active Downtime → Reason → Other Note
- **Astemo rebrand complete**: dark theme via `AstemoColors` palette class, logo on all screens
- **Sync indicator**: green/yellow/red status on home screen
- **Env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LINE_SHORT_NAME` (in `.env`, gitignored)

## What's Working
- Control center builds cleanly (`npm run build` passes)
- Supabase client is typed with generated DB types
- All admin CRUD operations wired to Supabase REST API
- Astemo branding applied to both apps (CSS + Flutter theme)

## What's Done This Session

- **22 sample downtime events seeded** into live Supabase — History and Reports pages now show data (21 closed + 1 open, spanning June 16–29 2026, across all 7 equipment pieces)
- **CSV export added to Reports page** — "Export CSV" button exports all events; per-table "CSV" buttons export each breakdown table
- **Session handoff document** created

## What's Next (recommended priority)

1. **Run drift code generation** on local machine — `cd tablet && dart run build_runner build --delete-conflicting-outputs` (generates `database.g.dart` needed for compile)
2. **Vercel deployment** — Deploy the control center. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.
3. **Flutter tablet build + test** — Run `flutter run` on a connected device/emulator. All screens, offline sync, and alert logic are implemented but haven't been tested on a real device.
4. **Alert sound asset** — An `assets/sounds/alert.wav` file needs to be added to the tablet project for the downtime alert.
5. **Enable leaked-password protection** — Supabase Auth security advisor recommendation.

## Environment Notes
- The sandbox environment cannot reach `*.supabase.co` directly (egress proxy blocks it), but Supabase MCP tools work for SQL and admin operations.
- Git push requires a GitHub personal access token in the URL: `git push "https://x-access-token:<TOKEN>@github.com/Reluyo/Downtime-Tracker.git" claude/vigilant-curie-yv0pra:claude/vigilant-curie-yv0pra`
- The previous PAT was shared in chat and should be rotated. Ask the user for a fresh one.

## Key Files

| File | Purpose |
|---|---|
| `PRODUCT_SPEC.md` | Full product specification |
| `control-center/src/lib/api.ts` | All Supabase API calls |
| `control-center/src/lib/supabaseClient.ts` | Typed Supabase client |
| `control-center/src/types.ts` | Manual TypeScript types |
| `control-center/src/types/database.types.ts` | Auto-generated Supabase types |
| `control-center/src/index.css` | All CSS (Astemo dark theme) |
| `control-center/src/components/AstemoLogo.tsx` | Corporate wordmark component |
| `control-center/src/components/Layout.tsx` | App shell (header, nav, outlet) |
| `tablet/lib/ui/theme.dart` | Flutter color palette + ThemeData |
| `tablet/lib/ui/widgets/astemo_logo.dart` | Flutter logo widget |
| `tablet/lib/main.dart` | Flutter app entry point |
