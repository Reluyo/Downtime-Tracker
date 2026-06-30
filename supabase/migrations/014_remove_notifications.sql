-- ============================================================================
-- Migration 014 — Remove extended-downtime email notification feature
-- ============================================================================
-- Reverses 011_notifications.sql and 013_notify_cron.sql. The company uses
-- separate software for downtime notifications, so this feature is removed.
-- ============================================================================

select cron.unschedule(jobid) from cron.job where jobname = 'notify-downtime-extended-events';

drop table if exists public.notification_log;
drop table if exists public.global_notification_emails;

alter table public.app_config
    drop column if exists notify_enabled,
    drop column if exists notify_threshold_minutes,
    drop column if exists notify_emails;
