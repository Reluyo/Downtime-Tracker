-- ============================================================================
-- Migration 008 — "Line Stop" virtual equipment per line + reason codes
-- ============================================================================
-- Adds a "Line Stop" equipment entry and standard reason codes to every
-- existing line. New lines should have this added via the control center.
-- ============================================================================

do $$
declare
    v_line record;
    v_equip_id uuid;
    reason_label text;
    reason_order int;
begin
    for v_line in select id from public.lines loop
        -- Upsert the Line Stop equipment (uses unique index from migration 002)
        insert into public.equipment (line_id, name, display_order, is_active)
            values (v_line.id, 'Line Stop', 0, true)
            on conflict (line_id, name)
            do update set display_order = 0, is_active = true
            returning id into v_equip_id;

        if v_equip_id is null then
            select id into v_equip_id
                from public.equipment
                where line_id = v_line.id and name = 'Line Stop';
        end if;

        reason_order := 1;
        foreach reason_label in array array[
            'No Material Available',
            'No Operator Available',
            'Meeting',
            'Other'
        ] loop
            insert into public.downtime_reasons
                    (equipment_id, label, requires_note, display_order, is_active)
                values (
                    v_equip_id,
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
