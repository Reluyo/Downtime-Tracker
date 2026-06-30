-- ============================================================================
-- Migration 013 — Schedule the notify-downtime edge function
-- ============================================================================
-- Runs every 5 minutes via pg_cron + pg_net, calling the notify-downtime
-- edge function with the service role key so it can read app_config /
-- notification_log and write notification_log entries.
--
-- MANUAL SETUP REQUIRED before this migration will actually fire anything:
--   1. In the Supabase dashboard, set project secrets (Edge Functions ->
--      notify-downtime -> Secrets): RESEND_API_KEY, NOTIFY_FROM_EMAIL.
--   2. Run the two `select vault.create_secret(...)` calls below once,
--      by hand, substituting your project's URL and service_role key
--      (Settings -> API). They are NOT included here because the service
--      role key must never be committed to the repo / migration history.
--
--      select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--      select vault.create_secret('<service-role-key>', 'service_role_key');
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
    'notify-downtime-extended-events',
    '*/5 * * * *',
    $$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notify-downtime',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);
