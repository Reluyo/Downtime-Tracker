# Production Readiness Review — Astemo Downtime Tracker

Audience: going live on the PRSA 2 floor with ~500 operators across shifts. This
document captures what was reviewed, what's risky, and what must be fixed
before/soon-after go-live. Severity: **P0** = fix before go-live, **P1** = fix
within first week, **P2** = backlog.

## What could realistically go wrong on Day 1

1. **Supabase has a network hiccup mid-shift.** No client-side timeout is
   configured, so a hung request can block the tablet UI indefinitely instead
   of falling back to the offline queue.
2. **A tablet app crashes** while a downtime timer is running (battery pull,
   OOM, OS update). There's no `runZonedGuarded`/`FlutterError.onError`, so the
   crash isn't logged anywhere, and on restart the operator has no prompt to
   resume the in-progress event — risk of a duplicate or lost event.
3. **An admin's password gets guessed/shared.** Minimum password length is 6
   characters with no lockout after repeated failed logins.
4. **Nobody notices the backend is down.** There is no external uptime check;
   the only signal is the tablet's in-app sync indicator, which a busy
   operator may not look at for hours.
5. **A bad migration or fat-fingered delete in the control center** has no
   verified backup/restore path — point-in-time recovery is a Supabase project
   setting that has not been confirmed as enabled.
6. **Reports straddle midnight incorrectly** if the browser timezone differs
   from the plant's timezone, double-counting or dropping events for the
   shift boundary.
7. **The APK can't be redistributed quickly.** There's no signed-release
   pipeline; updating 500 tablets means manually rebuilding and sideloading.
8. **A control-center error throws a raw Postgres/RLS error** ("foreign key
   violation...") at an admin with no actionable message.

## Checklist before production

### P0 — fix before go-live
- [ ] Confirm Supabase automated backups / point-in-time recovery are enabled
      (Dashboard → Settings → Backups) and write down the restore procedure.
- [x] Raise admin password minimum from 6 to 12 characters (`UsersPage.tsx`,
      `manage-users` edge function `ChangePassword.tsx`).
- [x] Add request timeouts to the Supabase client on both apps so a hung
      network call can't block the UI forever.
- [x] Add a global Dart crash handler (`runZonedGuarded` + `FlutterError.onError`)
      that persists the error so a crash isn't silent.
- [ ] Add external uptime monitoring (e.g. a status-check ping) for the
      Supabase project URL and the deployed control-center URL, alerting a
      real person (email/SMS) on failure.
- [ ] Verify the control-center deploy target (Vercel project) is actually
      configured and document the deploy command — the CI workflow builds but
      does not deploy.
- [ ] Decide and document the timezone used for report date-range boundaries
      (plant-local vs. browser-local) and fix `ReportsPage.tsx` accordingly.

### P1 — fix in week 1
- [ ] Add account lockout / rate limiting on admin login (Supabase Auth has no
      built-in lockout; needs an edge function or external rate limiter).
- [ ] Add a session-idle timeout for the control center (shared workstation
      risk).
- [ ] On tablet startup, detect any unsynced/open local event from a previous
      session and prompt the operator to resume or discard it instead of
      silently losing the in-progress state.
- [ ] Wrap control-center Supabase error responses in user-readable messages
      instead of surfacing raw Postgres errors.
- [ ] Add a signed-release build pipeline for the tablet APK so updates can be
      pushed without manual sideloading on all 7 tablets.
- [ ] Add basic crash/error reporting (Sentry or similar free tier) for both
      apps so failures are visible without someone filing a ticket.
- [ ] Add an audit log of admin actions (user created/deleted/role changed,
      password reset) — currently no trail beyond `created_at`.

### P2 — backlog
- [ ] Cap/monitor the offline sync queue size on tablets for extended outages.
- [ ] Document a DB migration rollback procedure (migrations are forward-only
      today).
- [ ] Add a "Forgot password" self-service flow for admins.
- [ ] Add a version/build banner in the control-center UI so support can ask
      "what version are you on" and tablets so field issues can be traced to
      a specific APK build.

## Areas reviewed and current state

| Area | Current state | Gap |
|---|---|---|
| Error handling | try/catch around sync paths; control-center surfaces raw Supabase errors | No error normalization for end users |
| Logging | `debugPrint`/`console.error` only, stripped in release builds | No persistent or remote logging |
| Monitoring | In-app sync indicator only | No external uptime/alerting |
| Recoverability | Events written to SQLite before sync (durable) | No resume-in-progress-event UX after crash/restart |
| Backup | Supabase project (backup config unverified) | Confirm PITR enabled; document restore steps |
| Offline handling | SQLite-first writes, periodic + connectivity-triggered sync, retry with backoff | No queue overflow protection for very long outages |
| Network failures | Backoff retry in tablet sync service | No timeout previously configured (fixed, see below) |
| Timeouts | None previously | Added to Supabase clients (tablet + control-center) |
| Crash recovery | React `ErrorBoundary` on control-center | No Dart-side global handler (fixed, see below) |
| Deployment | CI builds/tests both apps | No control-center deploy step; no signed APK pipeline |
| Configuration | `.env.example` documented, secrets not in git history | No env validation at build time |
| Versioning | `pubspec.yaml` 0.x, `package.json` 0.x, numbered SQL migrations | No semver release process, no migration version table |
| User management | Supabase Auth + `manage-users` edge function, forced password change on creation | Weak password minimum (fixed, see below), no lockout, no session timeout, no audit trail |
| Security | RLS enabled on all tables; tablet uses anon key by design (per spec) | No device-level restriction beyond anon key; anon key visible in CI logs/.env.example (expected for this architecture) |
| Reporting | Server-side aggregation RPCs, chunked CSV export | Timezone ambiguity in date-range filtering |

## Changes made in this pass

- Raised the admin password minimum to 12 characters in `UsersPage.tsx` and
  `ChangePassword.tsx`.
- Added explicit request timeouts to the Supabase client config on both the
  tablet (`supabase.dart`) and control center (`supabaseClient.ts`).
- Added a global Dart error handler (`runZonedGuarded` + `FlutterError.onError`)
  in `tablet/lib/main.dart` so crashes are captured instead of silently
  terminating the app.

Everything else in the P0/P1/P2 lists above requires a decision or
infrastructure step (Supabase dashboard settings, hosting account access,
monitoring vendor choice) that needs sign-off before implementation.
