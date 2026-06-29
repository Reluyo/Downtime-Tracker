-- ============================================================================
-- Migration 004 — Role-based access (admin / viewer)
-- ============================================================================
-- Adds a user_roles table that maps Supabase Auth users to a role.
-- Admins can read + write everything. Viewers can only read + pull reports.
--
-- Existing RLS policies are replaced with role-aware versions.
-- ============================================================================

create table if not exists public.user_roles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    role    text not null default 'viewer' check (role in ('admin', 'viewer')),
    created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Only authenticated users can read their own role; admins can read all.
create policy "roles: users read own"
    on public.user_roles for select
    to authenticated
    using (
        user_id = auth.uid()
        or exists (
            select 1 from public.user_roles r
            where r.user_id = auth.uid() and r.role = 'admin'
        )
    );

-- Only admins can manage roles.
create policy "roles: admin write"
    on public.user_roles for all
    to authenticated
    using (
        exists (
            select 1 from public.user_roles r
            where r.user_id = auth.uid() and r.role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.user_roles r
            where r.user_id = auth.uid() and r.role = 'admin'
        )
    );

-- Helper: returns true when the calling user is an admin.
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------------
-- Replace reference-table write policies to require admin role.
-- ---------------------------------------------------------------------------

drop policy if exists "lines: write for authenticated" on public.lines;
create policy "lines: admin write"
    on public.lines for all
    to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "equipment: write for authenticated" on public.equipment;
create policy "equipment: admin write"
    on public.equipment for all
    to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reasons: write for authenticated" on public.downtime_reasons;
create policy "reasons: admin write"
    on public.downtime_reasons for all
    to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "config: write for authenticated" on public.app_config;
create policy "config: admin write"
    on public.app_config for all
    to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events: delete for authenticated" on public.downtime_events;
create policy "events: admin delete"
    on public.downtime_events for delete
    to authenticated
    using (public.is_admin());

-- Admin-only update from control center (anon update policy still covers tablets).
-- We need a separate admin update policy so admins can edit any field.
