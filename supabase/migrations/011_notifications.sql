-- ============================================================================
-- Migration 011 — Extended-downtime email notifications
-- ============================================================================
-- Adds:
--   * app_config.notify_enabled / notify_threshold_minutes / notify_emails
--     (per-line notification settings, separate from the tablet audio alert)
--   * global_notification_emails — recipients notified for every line
--   * notification_log — record of sent notifications, used to dedupe and
--     to drive the "repeat every N minutes" behavior (reuses
--     alert_repeat_minutes as the repeat interval).
-- ============================================================================

alter table public.app_config
    add column if not exists notify_enabled boolean not null default false,
    add column if not exists notify_threshold_minutes integer not null default 60,
    add column if not exists notify_emails text[] not null default '{}';

create table if not exists public.global_notification_emails (
    id         uuid primary key default gen_random_uuid(),
    email      text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.notification_log (
    id          uuid primary key default gen_random_uuid(),
    event_id    uuid not null references public.downtime_events (id) on delete cascade,
    line_id     uuid not null references public.lines (id) on delete cascade,
    notified_at timestamptz not null default now(),
    recipients  text[] not null
);

create index if not exists idx_notification_log_event on public.notification_log (event_id, notified_at desc);

alter table public.global_notification_emails enable row level security;
alter table public.notification_log           enable row level security;

-- Only admins manage the global recipient list (read + write).
create policy "global_emails: admin all"
    on public.global_notification_emails for all
    to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- Admins can read the notification history; only the service role (edge
-- function) inserts rows, which bypasses RLS.
create policy "notification_log: admin read"
    on public.notification_log for select
    to authenticated
    using (public.is_admin());
