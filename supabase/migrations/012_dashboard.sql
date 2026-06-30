-- ============================================================================
-- Migration 012 — Live dashboard support: Availability OEE
-- ============================================================================
-- Availability = Run Time / Planned Production Time.
-- Planned Production Time is derived from the line's configured shifts
-- (public.shifts), applied to every day in the requested range. Lines with
-- no shifts configured fall back to 24h/day so availability is still
-- computable, with a planned_seconds of 0 surfaced as null% in the UI.
-- ============================================================================

create or replace function public.line_availability(
    p_line_id uuid,
    p_start date,
    p_end date
) returns table (
    planned_seconds bigint,
    downtime_seconds bigint,
    availability_pct numeric
) as $$
declare
    v_day date;
    v_shift_seconds bigint := 0;
    v_planned bigint := 0;
    v_downtime bigint := 0;
begin
    select coalesce(sum(
        case
            when end_hour > start_hour then (end_hour - start_hour) * 3600
            when end_hour < start_hour then (24 - start_hour + end_hour) * 3600
            else 24 * 3600
        end
    ), 0)
    into v_shift_seconds
    from public.shifts
    where line_id = p_line_id;

    -- No shifts configured: treat every day as fully planned (24h).
    if v_shift_seconds = 0 then
        v_shift_seconds := 24 * 3600;
    end if;

    v_planned := v_shift_seconds * (p_end - p_start + 1);

    select coalesce(sum(e.duration_seconds), 0)
    into v_downtime
    from public.downtime_events e
    where e.line_id = p_line_id
      and e.deleted_at is null
      and e.duration_seconds is not null
      and e.started_at >= p_start::timestamptz
      and e.started_at < (p_end + 1)::timestamptz;

    return query select
        v_planned,
        v_downtime,
        case when v_planned > 0
            then round(100 * greatest(0, v_planned - v_downtime)::numeric / v_planned, 1)
            else null
        end;
end;
$$ language plpgsql stable;
