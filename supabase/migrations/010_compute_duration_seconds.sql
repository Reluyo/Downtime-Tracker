-- ============================================================================
-- Migration 010 — Compute duration_seconds server-side (re-applies 003)
-- ============================================================================
-- Migration 003 (compute_duration_trigger) was present in the repo but was
-- never actually applied to the database, so duration_seconds was never
-- populated and report RPCs (which filter on duration_seconds is not null)
-- silently excluded every closed event. This migration (re)creates the
-- trigger under new names and backfills existing rows.
-- ============================================================================

create or replace function public.compute_duration_seconds()
returns trigger as $$
begin
  if NEW.ended_at is not null then
    NEW.duration_seconds := greatest(0, extract(epoch from (NEW.ended_at - NEW.started_at))::integer);
  else
    NEW.duration_seconds := null;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_events_compute_duration on public.downtime_events;
create trigger trg_events_compute_duration
  before insert or update of started_at, ended_at on public.downtime_events
  for each row
  execute function public.compute_duration_seconds();

update public.downtime_events
set duration_seconds = greatest(0, extract(epoch from (ended_at - started_at))::integer)
where ended_at is not null and duration_seconds is null;
