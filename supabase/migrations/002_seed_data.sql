-- ============================================================================
-- PRSA Downtime Tracker — Seed Data
-- Migration 002
-- ============================================================================
-- Seeds the "Piston Rod Sub Assembly 2" (PRSA 2) line, its 7 pieces of
-- equipment, the reason codes for each, and the default app_config.
--
-- Safe to re-run: uses ON CONFLICT / existence guards so it will not create
-- duplicates. Equipment is keyed by (line_id, name); reasons by
-- (equipment_id, label).
-- ============================================================================

-- Uniqueness needed for the idempotent upserts below.
create unique index if not exists uq_equipment_line_name
    on public.equipment (line_id, name);
create unique index if not exists uq_reasons_equipment_label
    on public.downtime_reasons (equipment_id, label);

do $$
declare
    v_line_id uuid;
    v_equipment_id uuid;
    -- equipment_name -> ordered list of reason labels
    rec record;
    reason_label text;
    reason_order int;
begin
    -- ------------------------------------------------------------------
    -- Line
    -- ------------------------------------------------------------------
    select id into v_line_id
        from public.lines
        where short_name = 'PRSA 2';

    if v_line_id is null then
        insert into public.lines (name, short_name)
            values ('Piston Rod Sub Assembly 2', 'PRSA 2')
            returning id into v_line_id;
    end if;

    -- ------------------------------------------------------------------
    -- App config (one per line)
    -- ------------------------------------------------------------------
    insert into public.app_config (line_id, alert_threshold_minutes, alert_repeat_minutes)
        values (v_line_id, 60, 15)
        on conflict (line_id) do nothing;

    -- ------------------------------------------------------------------
    -- Equipment + reason codes
    -- ------------------------------------------------------------------
    -- Each row: (display_order, equipment_name, reason_labels in order).
    -- "Other" is always last and is the only reason with requires_note = true.
    for rec in
        select * from (values
            (1, 'Lower Valve Feeder', array[
                'Material Service','Tooling Maintenance','Station Maintenance',
                'QA Maintenance','Preventive Maintenance','Waiting for Support','Other']),
            (2, 'Upper Valve Feeder', array[
                'Material Service','Tooling Maintenance','Station Maintenance',
                'QA Maintenance','Preventive Maintenance','Waiting for Support','Other']),
            (3, 'Assembly Table', array[
                'Jig Maintenance','Torque Station','QA Station','Riveting Station',
                'Piston Looseness Station','Safety Fence','Index Table',
                'Preventive Maintenance','Changeover','Startup','Waiting for Support','Other']),
            (4, 'Wash Robot', array[
                'Robot Maintenance','Preventive Maintenance','Waiting for Support','Other']),
            (5, 'Washer', array[
                'Water Temperature','Conveyor Maintenance','Wash Fluid Concentration',
                'Water Level','Preventive Maintenance','Waiting for Support','Other']),
            (6, 'ECT Robot', array[
                'Robot Maintenance','Preventive Maintenance','Waiting for Support','Other']),
            (7, 'ECT', array[
                'Calibration','Probe Maintenance','Safety Fence','Linear Slide Maintenance',
                'Payout Conveyor','Vision System','Preventive Maintenance',
                'Waiting for Support','Other'])
        ) as t(display_order, equipment_name, reasons)
    loop
        -- Upsert equipment
        insert into public.equipment (line_id, name, display_order, is_active)
            values (v_line_id, rec.equipment_name, rec.display_order, true)
            on conflict (line_id, name)
            do update set display_order = excluded.display_order
            returning id into v_equipment_id;

        if v_equipment_id is null then
            select id into v_equipment_id
                from public.equipment
                where line_id = v_line_id and name = rec.equipment_name;
        end if;

        -- Upsert reasons in order
        reason_order := 1;
        foreach reason_label in array rec.reasons
        loop
            insert into public.downtime_reasons
                    (equipment_id, label, requires_note, display_order, is_active)
                values (
                    v_equipment_id,
                    reason_label,
                    (reason_label = 'Other'),
                    reason_order,
                    true)
                on conflict (equipment_id, label)
                do update set
                    requires_note = excluded.requires_note,
                    display_order = excluded.display_order;
            reason_order := reason_order + 1;
        end loop;
    end loop;
end $$;
