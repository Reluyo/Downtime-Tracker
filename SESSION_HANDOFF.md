# Session Handoff — PRSA Downtime Tracker

## Project Overview

Manufacturing downtime tracking system for the **Piston Rod Sub Assembly 2 (PRSA 2)** line at Astemo. Two apps share a single Supabase backend:

- **Tablet App** (`/tablet`) — Flutter, operator-facing, deployed on Amazon Fire tablets
- **Control Center** (`/control-center`) — React 18 / Vite / TypeScript, admin-facing

## Current State

### Branch
- **All work merged to `main`** — branch `claude/eloquent-sagan-w0t9ft` was merged
- **Latest commit on main**: `0eee95f` — Fix role lookup via security definer RPC

### Supabase Backend
- **Project ID**: `ktcdpogaxxmjdqhsmiev`
- **Project name**: Downtime Tracker
- **Region**: us-east-1
- **Status**: ACTIVE_HEALTHY
- **Schema**: 7 tables — `lines`, `equipment`, `downtime_reasons`, `downtime_events`, `app_config`, `user_roles`, `shifts`
- **Migrations applied**: 001 through 009 (all applied to production)
- **Edge Functions**: `manage-users` — admin user CRUD via service role key
- **Auth**: Admin user `rolando.cruz.ag@astemo.com` (UUID: `be4c7a7e-c335-4d9d-b528-3fccfcf93c30`)
- **RLS**: Anon can read config + insert/update events; admin role required for writes to reference tables; `is_admin()` security definer function for policy checks
- **RPCs**: `downtime_by_equipment`, `downtime_by_reason`, `downtime_by_day`, `downtime_summary`, `open_events`, `is_admin`, `get_my_role`
- **Seed data**: 1 line (PRSA 2), 7 equipment pieces + "Line Stop" virtual equipment, reason codes per spec + Line Stop reasons (No Material, No Operator, Meeting, Other), 22 sample events

### Migrations Summary

| # | Name | What it does |
|---|------|-------------|
| 001 | initial_schema | lines, equipment, downtime_reasons, downtime_events, app_config + RLS |
| 002 | seed_data | PRSA 2 line, 7 equipment, reason codes, default config |
| 003 | duration_trigger | Server-side duration_seconds computation trigger |
| 004 | user_roles | user_roles table, is_admin() RPC, role-aware RLS policies |
| 005 | tablet_line_selection | Tighten anon insert policy (valid line_id check) |
| 006 | server_aggregation | Report RPCs (by equipment/reason/day/summary) |
| 007 | shifts_softdelete_concurrency | shifts table, deleted_at + updated_at on events, updated RPCs, open_events RPC |
| 008 | line_stop_equipment | "Line Stop" equipment + reason codes per line |
| 009 | get_my_role_rpc | get_my_role() security definer RPC for role lookup |

### Control Center (React)
- **7 pages**: History, Equipment, Reason Codes, Configuration, Users, Reports
- **Admin-only pages**: Equipment, Reason Codes, Configuration, Users (gated by `AdminRoute` + nav filtering)
- **Users page**: Full CRUD — create users with email/password/role, edit role, reset password, delete users. Calls `manage-users` edge function.
- **History page**: Real-time via Supabase Realtime, pagination, filters, "Currently Down" banner with live timers, inline edit modal with time validation (start < end, end not future), soft delete, optimistic concurrency
- **Reports page**: By Equipment, By Reason, By Day tables with Pareto bar charts, CSV export per table + full export
- **Config page**: Alert threshold/repeat settings + shift CRUD (name, start hour, end hour, display order)
- **Auth flow**: Supabase Auth email/password → RoleProvider fetches role via `get_my_role()` RPC → admin/viewer routing
- **CSS**: Astemo dark theme, CSS modules for page-specific styles
- **Tests**: 19 Vitest tests passing (ErrorBoundary, RoleContext, format utils)

### Tablet App (Flutter)
- **Screen flow**: Home → Active Downtime → Reason → Other Note (confirmation screen removed — direct to timer)
- **New screens**: Log Past Event (multi-step: equipment → times → reason), Edit Last Event (change reason/note on most recent event)
- **Alert system**: Configurable threshold + repeat interval, sound + haptic, mute button, "Still Down" / "Mute" / "Resolved" dialog
- **Home screen**: Equipment grid, last event card with Edit button, sync indicator with last synced timestamp, "Log Past Event" button in app bar
- **Sync**: Offline-first via Drift SQLite, auto-sync on connectivity change + 60s periodic, exponential backoff retry, last synced timestamp
- **Repository**: startEvent, resolveEvent, discardEvent, createPastEvent, lastResolvedEvent, updateEventReason

## Architecture Decisions

- **Role lookup**: Uses `get_my_role()` security definer RPC instead of direct `user_roles` table query. The RLS SELECT policy on `user_roles` had a self-referential subquery that caused silent failures; the RPC bypasses RLS entirely.
- **User management**: Edge function (`manage-users`) because creating auth users requires the service role key, which can't be exposed to the browser. The function verifies the caller is admin before performing any operations.
- **Soft delete**: `deleted_at` column on `downtime_events` instead of hard delete. All RPCs and queries filter `deleted_at IS NULL`.
- **Optimistic concurrency**: `updated_at` column auto-set by trigger on every update. Edit modal passes `expectedUpdatedAt` to detect concurrent modifications.
- **Tablet auth**: No authentication (anonymous access via anon key). Intentional — no login friction for operators. RLS restricts anon to read config + insert/update events only.

## What's Working
- Control center builds cleanly (`npm run build`, `tsc -b` pass)
- All 19 tests pass
- All migrations applied to production Supabase
- Edge function deployed and active
- Admin role assigned to rolando.cruz.ag@astemo.com
- Role lookup works via security definer RPC

## What Needs Attention

1. **Test the control center in browser** — Verify the Users page works end-to-end (create user, change role, reset password, delete)
2. **Run Drift codegen** — `cd tablet && dart run build_runner build --delete-conflicting-outputs` (generates `database.g.dart` needed for compile)
3. **Deploy control center** — Vercel or similar. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.
4. **Flutter build + device test** — All screens implemented but not tested on a real device
5. **Revoke GitHub PAT** — The PAT used for pushing in this session should be rotated immediately.

## Environment Notes
- Git push requires a GitHub PAT — the proxy blocks direct git operations. Set remote URL temporarily: `git remote set-url origin https://<PAT>@github.com/reluyo/Downtime-Tracker.git`, push, then reset.
- Supabase MCP tools work for SQL and admin operations from the sandbox.
- Chromium + Playwright pre-installed for browser testing.

## Key Files

| File | Purpose |
|---|---|
| `PRODUCT_SPEC.md` | Full product specification |
| `control-center/src/lib/api.ts` | All Supabase API calls + user management |
| `control-center/src/lib/supabaseClient.ts` | Typed Supabase client |
| `control-center/src/lib/RoleContext.tsx` | Role provider (admin/viewer) |
| `control-center/src/types/database.types.ts` | Supabase generated types (manually updated) |
| `control-center/src/App.tsx` | Router + auth gate + admin route guard |
| `control-center/src/components/Layout.tsx` | App shell (header, nav, outlet) |
| `control-center/src/pages/UsersPage.tsx` | User management CRUD page |
| `control-center/src/pages/HistoryPage.tsx` | Event history + currently-down banner |
| `control-center/src/pages/ReportsPage.tsx` | Reports with bar charts |
| `control-center/src/pages/ConfigPage.tsx` | Alert config + shift CRUD |
| `supabase/functions/manage-users/index.ts` | Edge function for user CRUD |
| `supabase/migrations/` | All 9 database migrations |
| `tablet/lib/data/repository.dart` | Data access layer (Drift + Supabase) |
| `tablet/lib/services/sync_service.dart` | Offline sync engine |
| `tablet/lib/ui/home_screen.dart` | Operator home screen |
| `tablet/lib/ui/active_downtime_screen.dart` | Timer + alert screen |
| `tablet/lib/ui/past_event_screen.dart` | Retroactive event entry |
| `tablet/lib/ui/edit_event_screen.dart` | Edit last event reason/note |
