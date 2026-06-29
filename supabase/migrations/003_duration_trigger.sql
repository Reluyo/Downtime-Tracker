-- ============================================================================
-- Migration 003 — Compute duration_seconds server-side
-- ============================================================================
-- Removes client-side duration calculation by adding a trigger that
-- automatically sets duration_seconds = EXTRACT(EPOCH FROM ended_at - started_at)
-- on every INSERT or UPDATE of downtime_events where both timestamps exist.
-- ============================================================================

create or replace function public.compute_duration()
returns trigger as $$
begin
  if NEW.ended_at is not null and NEW.started_at is not null then
    NEW.duration_seconds := greatest(0, extract(epoch from NEW.ended_at - NEW.started_at)::int);
  else
    NEW.duration_seconds := null;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_compute_duration
  before insert or update on public.downtime_events
  for each row execute function public.compute_duration();
