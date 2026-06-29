-- ============================================================================
-- PRSA Downtime Tracker — Initial Schema
-- Migration 001
-- ============================================================================
-- Creates the core tables, indexes, and Row Level Security policies.
--
-- Security model:
--   * Tablets authenticate with the publishable (anon) key and have NO user
--     login. They need to READ configuration (lines, equipment, reasons,
--     app_config) and INSERT/UPDATE downtime events.
--   * Admins authenticate via Supabase Auth and may manage everything.
--
-- See 002_seed_data.sql for the PRSA 2 seed data.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.lines (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    short_name  text not null,
    created_at  timestamptz not null default now()
);

create table if not exists public.equipment (
    id            uuid primary key default gen_random_uuid(),
    line_id       uuid not null references public.lines (id) on delete cascade,
    name          text not null,
    display_order integer not null default 0,
    is_active     boolean not null default true,
    created_at    timestamptz not null default now()
);

create table if not exists public.downtime_reasons (
    id            uuid primary key default gen_random_uuid(),
    equipment_id  uuid not null references public.equipment (id) on delete cascade,
    label         text not null,
    requires_note boolean not null default false,
    display_order integer not null default 0,
    is_active     boolean not null default true,
    created_at    timestamptz not null default now()
);

create table if not exists public.downtime_events (
    id               uuid primary key default gen_random_uuid(),
    line_id          uuid not null references public.lines (id) on delete cascade,
    equipment_id     uuid not null references public.equipment (id) on delete cascade,
    reason_id        uuid references public.downtime_reasons (id) on delete set null,
    note             text,
    started_at       timestamptz not null,
    ended_at         timestamptz,
    duration_seconds integer,
    synced           boolean not null default false,
    created_at       timestamptz not null default now()
);

create table if not exists public.app_config (
    id                      uuid primary key default gen_random_uuid(),
    line_id                 uuid not null unique references public.lines (id) on delete cascade,
    alert_threshold_minutes integer not null default 60,
    alert_repeat_minutes    integer not null default 15,
    updated_at              timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes (support the control-center history filters and reporting)
-- ----------------------------------------------------------------------------

create index if not exists idx_equipment_line          on public.equipment (line_id);
create index if not exists idx_reasons_equipment        on public.downtime_reasons (equipment_id);
create index if not exists idx_events_line              on public.downtime_events (line_id);
create index if not exists idx_events_equipment         on public.downtime_events (equipment_id);
create index if not exists idx_events_reason            on public.downtime_events (reason_id);
create index if not exists idx_events_started_at        on public.downtime_events (started_at);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Roles:
--   anon          -> tablets (publishable key, no login)
--   authenticated -> admins (Supabase Auth)
-- ----------------------------------------------------------------------------

alter table public.lines            enable row level security;
alter table public.equipment        enable row level security;
alter table public.downtime_reasons enable row level security;
alter table public.downtime_events  enable row level security;
alter table public.app_config       enable row level security;

-- Reference/config tables: anyone (tablet or admin) may read; only admins write.

-- lines
create policy "lines: read for all"
    on public.lines for select
    using (true);
create policy "lines: write for authenticated"
    on public.lines for all
    to authenticated
    using (true) with check (true);

-- equipment
create policy "equipment: read for all"
    on public.equipment for select
    using (true);
create policy "equipment: write for authenticated"
    on public.equipment for all
    to authenticated
    using (true) with check (true);

-- downtime_reasons
create policy "reasons: read for all"
    on public.downtime_reasons for select
    using (true);
create policy "reasons: write for authenticated"
    on public.downtime_reasons for all
    to authenticated
    using (true) with check (true);

-- app_config
create policy "config: read for all"
    on public.app_config for select
    using (true);
create policy "config: write for authenticated"
    on public.app_config for all
    to authenticated
    using (true) with check (true);

-- downtime_events:
--   tablets (anon) may read, insert, and update (to close an event) but NOT
--   delete. Admins may do everything, including edit/delete from the control
--   center.
create policy "events: read for all"
    on public.downtime_events for select
    using (true);
create policy "events: insert for all"
    on public.downtime_events for insert
    with check (true);
create policy "events: update for all"
    on public.downtime_events for update
    using (true) with check (true);
create policy "events: delete for authenticated"
    on public.downtime_events for delete
    to authenticated
    using (true);
