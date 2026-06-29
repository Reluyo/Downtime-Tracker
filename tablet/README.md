# PRSA Downtime — Tablet App

Operator-facing Flutter app for logging downtime, deployed on Amazon Fire
tablets. Offline-first: events are written to local SQLite (via `drift`) and
synced to Supabase when connectivity returns.

> **Note:** This folder was hand-authored as a scaffold in an environment
> without the Flutter SDK. Before the first run you must generate the platform
> folders and drift code (steps below).

## First-time setup

```bash
cd tablet

# 1. Generate the Android/iOS platform folders (keeps lib/, pubspec.yaml, .env).
flutter create .

# 2. Connection config — copy and fill in (publishable/anon key only).
cp .env.example .env

# 3. Fetch packages.
flutter pub get

# 4. Generate drift code (creates lib/data/local/database.g.dart).
dart run build_runner build --delete-conflicting-outputs

# 5. Run.
flutter run
```

Build a release APK for the Fire tablet:

```bash
flutter build apk --release
```

## Layout

```
lib/
├── main.dart                 App entry: load .env, open db, init Supabase
├── config/
│   ├── env.dart              Typed access to .env values
│   └── supabase.dart         Supabase client initialization
├── data/local/
│   └── database.dart         drift schema: cached config + local event queue
└── ui/
    └── home_screen.dart      Step 1 home screen (scaffold)
```

## What's wired vs. to build

**Wired (scaffold):** env loading, Supabase init, drift database with cached
config tables + offline event queue, home screen with line name and sync-status
indicator.

**To build next:** equipment button grid, confirmation screen, active-downtime
stopwatch with alert logic (`alert_threshold_minutes` / `alert_repeat_minutes`),
reason screen with the "Other" note field (240-char limit), and the
sync service (local SQLite → Supabase with connectivity detection).
