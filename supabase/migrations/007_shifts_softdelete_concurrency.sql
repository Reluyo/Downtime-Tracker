-- ============================================================================
-- Migration 007 — Shifts, soft delete, optimistic concurrency
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Shifts table — configurable per line
-- ---------------------------------------------------------------------------

create table if not exists public.shifts (
    id            uuid primary key default gen_random_uuid(),
    line_id       uuid not null references public.lines (id) on delete cascade,
    name          text not null,
    start_hour    integer not null check (start_hour >= 0 and start_hour < 24),
    end_hour      integer not null check (end_hour >= 0 and end_hour < 24),
    display_order integer not null default 0,
    created_at    timestamptz not null default now()
);

create index if not exists idx_shifts_line on public.shifts (line_id);

alter table public.shifts enable row level security;

create policy "shifts: read for all"
    on public.shifts for select using (true);
create policy "shifts: admin write"
    on public.shifts for all
    to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Soft delete on downtime_events
-- ---------------------------------------------------------------------------

alter table public.downtime_events add column if not exists deleted_at timestamptz;

create index if not exists idx_events_deleted_at on public.downtime_events (deleted_at)
    where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. Optimistic concurrency on downtime_events
-- ---------------------------------------------------------------------------

alter table public.downtime_events add column if not exists updated_at timestamptz
    not null default now();

-- Auto-set updated_at on every update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_events_updated_at
  before update on public.downtime_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Update report RPCs to exclude soft-deleted events
-- ---------------------------------------------------------------------------

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
      and e.deleted_at is null
    group by e.equipment_id, eq.name
    order by total_seconds desc;
$$ language sql stable;

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
      and e.deleted_at is null
    group by e.reason_id, r.label
    order by total_seconds desc;
$$ language sql stable;

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
      and e.deleted_at is null
    group by day
    order by day;
$$ language sql stable;

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
      and e.duration_seconds is not null
      and e.deleted_at is null;
$$ language sql stable;

-- ---------------------------------------------------------------------------
-- 5. New RPC: currently open events (for dashboard)
-- ---------------------------------------------------------------------------

create or replace function public.open_events(p_line_id uuid)
returns table (
    id uuid,
    equipment_id uuid,
    equipment_name text,
    started_at timestamptz
) as $$
    select
        e.id,
        e.equipment_id,
        eq.name as equipment_name,
        e.started_at
    from public.downtime_events e
    join public.equipment eq on eq.id = e.equipment_id
    where e.line_id = p_line_id
      and e.ended_at is null
      and e.deleted_at is null
    order by e.started_at;
$$ language sql stable;
