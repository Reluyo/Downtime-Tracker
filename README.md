# PRSA Downtime Tracker

A manufacturing downtime tracking system for the Piston Rod Sub Assembly 2 (PRSA 2) production line.

## What It Does

Operators on the production floor use a tablet app to log downtime events in 3 taps. Admins use a web-based control center to view data, run reports, and manage equipment and reason codes.

## Apps

| App | Technology | Location |
|---|---|---|
| Tablet App | Flutter (Android / Fire OS) | `/tablet` |
| Control Center | React | `/control-center` |
| Backend | Supabase | Cloud (PoC) → local server (production) |

## Full Specification

See [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) for complete details including:
- Screen flows
- Database schema
- Seed data
- Design decisions

---

## Getting Started

### Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Supabase account](https://supabase.com) and a project created
- [Vercel account](https://vercel.com) (for control center deployment)

### Environment Variables

#### Tablet App (`/tablet`)
Create a `.env` file in `/tablet`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Control Center (`/control-center`)
Create a `.env` file in `/control-center`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> You can find these values in your Supabase project under **Settings → API**.

### Database Setup

1. Go to your Supabase project → **SQL Editor**
2. Run the migration file: `/supabase/migrations/001_initial_schema.sql`
3. Run the seed file: `/supabase/migrations/002_seed_data.sql`

### Running the Tablet App

```bash
cd tablet
flutter pub get
flutter run
```

To build for Amazon Fire tablet:
```bash
flutter build apk --release
```

### Running the Control Center

```bash
cd control-center
npm install
npm run dev
```

To deploy to Vercel:
```bash
npx vercel
```

---

## Project Status

- [x] Supabase schema and seed data (applied + committed in `/supabase/migrations`)
- [x] Monorepo scaffold (`/tablet`, `/control-center`)
- [x] React control center scaffold (Supabase client + auth wired, builds clean)
- [x] Flutter tablet app — full operator flow (grid → confirm → active → reason → "Other" note)
- [x] Offline sync (SQLite → Supabase) with sync-status indicator
- [x] Alert logic (threshold + repeat, bundled tone)
- [x] CI workflow to build the tablet APK (`.github/workflows/tablet-build.yml`)
- [ ] Control center features (history, equipment, reasons, config, reporting)
- [ ] Vercel deployment
- [ ] Fire tablet testing (build APK, sideload, validate on device)
