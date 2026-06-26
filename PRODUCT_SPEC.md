# PRODUCT_SPEC.md — PRSA Downtime Tracker

## Overview

A manufacturing downtime tracking system for the **Piston Rod Sub Assembly 2 (PRSA 2)** production line. The system consists of two apps sharing a single Supabase backend:

1. **Tablet App** (Flutter) — operator-facing, deployed on Amazon Fire tablets at the production line
2. **Control Center** (React web app) — admin-facing, deployed on Vercel for PoC, migrated to company local server later

---

## Business Context

- The PRSA 2 line has 7 pieces of equipment, each will eventually have a dedicated tablet
- For PoC: one tablet represents the full line
- When equipment goes down, an operator logs the event via 3 taps — no typing required (except for "Other" reason code)
- Downtime rolls up to the **LINE** level but tracks which **EQUIPMENT** caused it
- Admins manage equipment, reason codes, and app configuration via the control center
- Data is retained for approximately 1 year
- Target: ~20 downtime events per day across ~100 equipment (future state)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Tablet app | Flutter | Targets Android / Amazon Fire OS |
| Local offline storage | SQLite via `drift` package | Sync to Supabase when online |
| Backend | Supabase | Database + Auth |
| Control center | React | Deployed to Vercel (PoC) |
| Hosting (future) | Company local server | IT-managed migration after PoC |

---

## Repo Structure

```
/
├── README.md
├── PRODUCT_SPEC.md
├── /tablet               ← Flutter app
└── /control-center       ← React web app
```

---

## Tablet App

### Design Philosophy
- Operators should spend as little time as possible on the tablet
- Maximum 3 taps to log a downtime event
- No typing except when "Other" reason is selected
- Large buttons, high contrast, readable from a distance

### Screen Flow

```
[Home Screen]
→ Shows line name: "PRSA 2"
→ Grid of large buttons, one per equipment (active only)
→ Sync status indicator visible

↓ tap equipment

[Confirmation Screen]
→ "Start downtime for [Equipment Name]?"
→ START button (large)
→ Cancel button → returns to Home Screen

↓ tap START

[Active Downtime Screen]
→ Equipment name shown
→ Stopwatch counting up from 00:00:00
→ RESOLVED button (large, green)
→ Cancel button → shows confirmation dialog:
   "Are you sure? This will discard the event."
   → Confirm: discard event, return to Home Screen
   → Back: return to Active Downtime Screen

↓ tap RESOLVED

[Reason Screen]
→ Grid of large buttons showing reason codes for that equipment (active only)
→ If operator taps "Other":
   → Opens text input screen
   → 240 character max
   → Character counter displayed (e.g., "23/240")
   → SUBMIT button | Back button

↓ tap reason (or submit "Other" note)

→ Event saved locally to SQLite
→ Sync attempted to Supabase
→ Returns to Home Screen
```

### Alert Logic

- Configured per line by admin (`alert_threshold_minutes`, `alert_repeat_minutes`)
- Default: alert after 60 minutes, repeat every 15 minutes
- When threshold is reached: play audio alert + show on-screen alert dialog
- Alert options:
  - **"Still Down"** — dismisses alert, timer resets for next repeat interval
  - **"Resolved"** — navigates to Reason Screen to close the event
- Alert repeats at `alert_repeat_minutes` interval until event is closed

### Offline Handling

- All events are written to local SQLite (via `drift`) first
- Sync to Supabase attempted immediately when connectivity is available
- Sync status indicator on Home Screen:
  - Green: all events synced
  - Yellow: pending sync (offline or sync in progress)
  - Red: sync error
- Events include a `synced` boolean field to track sync state

---

## Control Center (React Web App)

### Access
- Admin login via Supabase Auth
- All admins can see all lines and all data

### Features

#### Downtime History
- View all downtime events in a table
- Filter by: date range, equipment, reason code
- Edit or delete individual events

#### Equipment Management
- Add new equipment to a line
- Edit equipment name or display order
- Deactivate equipment (hides from tablet without deleting history)

#### Reason Code Management
- Add new reason codes per equipment
- Edit reason code label or display order
- Toggle `requires_note` (for "Other"-style codes)
- Deactivate reason codes (hides from tablet without deleting history)

#### App Configuration (per line)
- Set `alert_threshold_minutes`
- Set `alert_repeat_minutes`

#### Reporting
- Total downtime by equipment (filterable by date range)
- Total downtime by reason code (filterable by date range)
- Total downtime by date (daily/weekly summary)

---

## Database Schema

### `lines`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | "Piston Rod Sub Assembly 2" |
| short_name | text | "PRSA 2" |
| created_at | timestamp | |

### `equipment`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| line_id | uuid | FK → lines |
| name | text | e.g., "Assembly Table" |
| display_order | integer | Controls button order on tablet |
| is_active | boolean | Default true; false hides from tablet |
| created_at | timestamp | |

### `downtime_reasons`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| equipment_id | uuid | FK → equipment |
| label | text | e.g., "Tooling Maintenance" |
| requires_note | boolean | Default false; true for "Other" |
| display_order | integer | Controls button order on tablet |
| is_active | boolean | Default true; false hides from tablet |
| created_at | timestamp | |

### `downtime_events`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| line_id | uuid | FK → lines |
| equipment_id | uuid | FK → equipment |
| reason_id | uuid | FK → downtime_reasons |
| note | text | Nullable; only used when reason is "Other" |
| started_at | timestamp | Set when operator taps START |
| ended_at | timestamp | Nullable; set when operator taps RESOLVED |
| duration_seconds | integer | Nullable; calculated on close |
| synced | boolean | Default false; true after successful Supabase sync |
| created_at | timestamp | |

### `app_config`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| line_id | uuid | FK → lines (one config per line) |
| alert_threshold_minutes | integer | Default 60 |
| alert_repeat_minutes | integer | Default 15 |
| updated_at | timestamp | |

### `users`
Managed by Supabase Auth. Role field: `admin`. Tablets have no user login — they are identified by the line they are assigned to.

---

## Seed Data

### Line
- Name: `Piston Rod Sub Assembly 2`
- Short name: `PRSA 2`

### Equipment & Reason Codes (in display order)

| # | Equipment | Reason Codes |
|---|---|---|
| 1 | Lower Valve Feeder | Material Service, Tooling Maintenance, Station Maintenance, QA Maintenance, Preventive Maintenance, Waiting for Support, Other |
| 2 | Upper Valve Feeder | Material Service, Tooling Maintenance, Station Maintenance, QA Maintenance, Preventive Maintenance, Waiting for Support, Other |
| 3 | Assembly Table | Jig Maintenance, Torque Station, QA Station, Riveting Station, Piston Looseness Station, Safety Fence, Index Table, Preventive Maintenance, Changeover, Startup, Waiting for Support, Other |
| 4 | Wash Robot | Robot Maintenance, Preventive Maintenance, Waiting for Support, Other |
| 5 | Washer | Water Temperature, Conveyor Maintenance, Wash Fluid Concentration, Water Level, Preventive Maintenance, Waiting for Support, Other |
| 6 | ECT Robot | Robot Maintenance, Preventive Maintenance, Waiting for Support, Other |
| 7 | ECT | Calibration, Probe Maintenance, Safety Fence, Linear Slide Maintenance, Payout Conveyor, Vision System, Preventive Maintenance, Waiting for Support, Other |

> "Other" has `requires_note = true` for all equipment.

### Default App Config for PRSA 2
- `alert_threshold_minutes`: 60
- `alert_repeat_minutes`: 15

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Timer starts before reason code | Yes | Operators may not know root cause immediately; more accurate timestamps |
| Reason selected at close | Yes | Technician knows the fix after resolving, not before |
| Tablets tied to equipment, not operators | Yes | Reduces login friction on production floor |
| "Other" requires text note | Yes | Preserves data quality; free text capped at 240 chars |
| Offline-first | Yes | Production floor connectivity cannot be guaranteed |
| Separate tablet and control center apps | Yes | Different audiences, different UX needs |
| PoC on Vercel, migrate to local server | Yes | Security requirement; IT involved at migration |
| Fire tablets for PoC | Yes | Cost-effective for proof of concept |
