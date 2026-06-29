-- ============================================================================
-- Migration 006 — Server-side report aggregation + pagination support
-- ============================================================================
-- RPC functions for reports so aggregation happens in Postgres, not the browser.
-- Also adds a function for paginated event listing.
-- ============================================================================

-- Downtime by equipment (for reports)
create or replace function public.downtime_by_equipment(
    p_line_id uuid,
    p_start timestamptz,
    p_end timestamptz
) returns table (
    equipment_id uuid,
    equipment_name text,
    total_seconds bigint,
    event_count bigint
) as $$
    select
        e.equipment_id,
        eq.name as equipment_name,
        coalesce(sum(e.duration_seconds), 0)::bigint as total_seconds,
        count(*)::bigint as event_count
    from public.downtime_events e
    join public.equipment eq on eq.id = e.equipment_id
    where e.line_id = p_line_id
      and e.started_at >= p_start
      and e.started_at <= p_end
      and e.duration_seconds is not null
    group by e.equipment_id, eq.name
    order by total_seconds desc;
$$ language sql stable;

-- Downtime by reason code (for reports)
create or replace function public.downtime_by_reason(
    p_line_id uuid,
    p_start timestamptz,
    p_end timestamptz
) returns table (
    reason_id uuid,
    reason_label text,
    total_seconds bigint,
    event_count bigint
) as $$
    select
        e.reason_id,
        coalesce(r.label, '(no reason)') as reason_label,
        coalesce(sum(e.duration_seconds), 0)::bigint as total_seconds,
        count(*)::bigint as event_count
    from public.downtime_events e
    left join public.downtime_reasons r on r.id = e.reason_id
    where e.line_id = p_line_id
      and e.started_at >= p_start
      and e.started_at <= p_end
      and e.duration_seconds is not null
    group by e.reason_id, r.label
    order by total_seconds desc;
$$ language sql stable;

-- Downtime by day (for reports)
create or replace function public.downtime_by_day(
    p_line_id uuid,
    p_start timestamptz,
    p_end timestamptz,
    p_timezone text default 'UTC'
) returns table (
    day date,
    total_seconds bigint,
    event_count bigint
) as $$
    select
        (e.started_at at time zone p_timezone)::date as day,
        coalesce(sum(e.duration_seconds), 0)::bigint as total_seconds,
        count(*)::bigint as event_count
    from public.downtime_events e
    where e.line_id = p_line_id
      and e.started_at >= p_start
      and e.started_at <= p_end
      and e.duration_seconds is not null
    group by day
    order by day;
$$ language sql stable;

-- Report summary (total events + total downtime for a date range)
create or replace function public.downtime_summary(
    p_line_id uuid,
    p_start timestamptz,
    p_end timestamptz
) returns table (
    total_seconds bigint,
    event_count bigint
) as $$
    select
        coalesce(sum(e.duration_seconds), 0)::bigint as total_seconds,
        count(*)::bigint as event_count
    from public.downtime_events e
    where e.line_id = p_line_id
      and e.started_at >= p_start
      and e.started_at <= p_end
      and e.duration_seconds is not null;
$$ language sql stable;
