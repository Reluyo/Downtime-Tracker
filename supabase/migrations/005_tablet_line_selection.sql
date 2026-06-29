-- ============================================================================
-- Migration 005 — Tablet line selection
-- ============================================================================
-- Tablets no longer use a hardcoded LINE_SHORT_NAME env var. Instead, they
-- present a line-picker on launch and store the selection locally. The RLS
-- policy on downtime_events for anon insert is tightened so tablets can only
-- insert events whose line_id matches a valid line.
-- ============================================================================

-- No schema changes needed — the tablet stores its selected line_id locally
-- in the Drift database. The existing `lines` table already supports
-- multiple lines and is readable by anon.
--
-- Tighten the anon insert policy: line_id must reference an existing line.
drop policy if exists "events: insert for all" on public.downtime_events;
create policy "events: insert for valid line"
    on public.downtime_events for insert
    with check (
        exists (select 1 from public.lines where id = line_id)
    );
