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
├── main.dart                       App entry + service singletons
├── config/
│   ├── env.dart                    Typed access to .env values
│   └── supabase.dart               Supabase client initialization
├── data/
│   ├── local/database.dart         drift schema: cached config + event queue
│   └── repository.dart             reference sync + event lifecycle
├── services/
│   └── sync_service.dart           connectivity-driven sync + status
└── ui/
    ├── home_screen.dart            Step 1: equipment grid + sync indicator
    ├── confirmation_screen.dart    Step 2: "Start downtime for ...?"
    ├── active_downtime_screen.dart Step 3: stopwatch + alert logic
    ├── reason_screen.dart          Step 4: reason grid
    └── other_note_screen.dart      Step 5: "Other" note (240 chars)
assets/sounds/alert.wav             Bundled alert tone
```

## How it works

- **Offline-first:** the line's equipment, reason codes, and alert config are
  cached locally (drift/SQLite) on first online launch, so the operator UI
  works without connectivity. Events are written locally and pushed to Supabase
  when online.
- **One event at a time** (PoC): Home → Confirm → Active → Reason → Home.
  Cancel on the active screen discards the event after a confirmation dialog.
- **Alerts:** after `alert_threshold_minutes` the alert tone plays and a dialog
  appears; "Still Down" resets the timer for the next `alert_repeat_minutes`,
  "Resolved" goes to the reason screen.
- **Sync status** indicator on Home: green (synced), amber (pending), red (error).

## Build verification

This code was authored without a local Flutter SDK, so it has **not** been
compiled here. Easiest way to get a buildable APK: the **Build Tablet APK**
GitHub Actions workflow runs codegen and produces a downloadable APK artifact
on every push. For a backend-connected APK, add repository secrets
`SUPABASE_URL` and `SUPABASE_ANON_KEY`.

> The workflow ships at `ci/tablet-build.yml` and must be moved to
> `.github/workflows/tablet-build.yml` to activate it (it couldn't be committed
> there automatically — the session token lacked the GitHub `workflow` scope).
> See the header of that file for the one-step instructions.
