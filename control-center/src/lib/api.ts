import { supabase } from './supabaseClient';
import type {
  AppConfig,
  DowntimeEventRow,
  DowntimeReason,
  Equipment,
  Line,
} from '../types';

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

export async function getLines(): Promise<Line[]> {
  const { data, error } = await supabase
    .from('lines')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export async function getEquipment(
  lineId: string,
  includeInactive = true,
): Promise<Equipment[]> {
  let query = supabase
    .from('equipment')
    .select('*')
    .eq('line_id', lineId)
    .order('display_order');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createEquipment(input: {
  line_id: string;
  name: string;
  display_order: number;
}): Promise<void> {
  const { error } = await supabase.from('equipment').insert(input);
  if (error) throw error;
}

export async function updateEquipment(
  id: string,
  patch: Partial<Pick<Equipment, 'name' | 'display_order' | 'is_active'>>,
): Promise<void> {
  const { error } = await supabase.from('equipment').update(patch).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Reasons
// ---------------------------------------------------------------------------

export async function getReasons(
  equipmentId: string,
  includeInactive = true,
): Promise<DowntimeReason[]> {
  let query = supabase
    .from('downtime_reasons')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('display_order');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createReason(input: {
  equipment_id: string;
  label: string;
  requires_note: boolean;
  display_order: number;
}): Promise<void> {
  const { error } = await supabase.from('downtime_reasons').insert(input);
  if (error) throw error;
}

export async function updateReason(
  id: string,
  patch: Partial<
    Pick<DowntimeReason, 'label' | 'requires_note' | 'display_order' | 'is_active'>
  >,
): Promise<void> {
  const { error } = await supabase
    .from('downtime_reasons')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

export async function getConfig(lineId: string): Promise<AppConfig | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('line_id', lineId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveConfig(
  lineId: string,
  values: { alert_threshold_minutes: number; alert_repeat_minutes: number },
): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('line_id', lineId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Downtime events
// ---------------------------------------------------------------------------

interface RawEventRow {
  id: string;
  line_id: string;
  equipment_id: string;
  reason_id: string | null;
  note: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  synced: boolean;
  created_at: string;
  equipment: { name: string } | { name: string }[] | null;
  downtime_reasons: { label: string } | { label: string }[] | null;
}

export interface EventFilters {
  lineId: string;
  startDate?: string; // ISO date (inclusive)
  endDate?: string; // ISO date (inclusive, end-of-day applied by caller)
  equipmentId?: string;
  reasonId?: string;
}

export async function getEvents(filters: EventFilters): Promise<DowntimeEventRow[]> {
  let query = supabase
    .from('downtime_events')
    .select(
      'id, line_id, equipment_id, reason_id, note, started_at, ended_at, ' +
        'duration_seconds, synced, created_at, ' +
        // Single FK to each related table, so the table name embeds unambiguously.
        'equipment ( name ), downtime_reasons ( label )',
    )
    .eq('line_id', filters.lineId)
    .order('started_at', { ascending: false });

  if (filters.startDate) query = query.gte('started_at', filters.startDate);
  if (filters.endDate) query = query.lte('started_at', filters.endDate);
  if (filters.equipmentId) query = query.eq('equipment_id', filters.equipmentId);
  if (filters.reasonId) query = query.eq('reason_id', filters.reasonId);

  const { data, error } = await query;
  if (error) throw error;

  // Without generated DB types, the embedded-relation select isn't inferred,
  // so map over an explicit raw shape.
  const rows = (data ?? []) as unknown as RawEventRow[];

  // Flatten the embedded relations into label fields.
  return rows.map((r): DowntimeEventRow => {
    const equipment = Array.isArray(r.equipment) ? r.equipment[0] : r.equipment;
    const reason = Array.isArray(r.downtime_reasons)
      ? r.downtime_reasons[0]
      : r.downtime_reasons;
    return {
      id: r.id,
      line_id: r.line_id,
      equipment_id: r.equipment_id,
      reason_id: r.reason_id,
      note: r.note,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_seconds: r.duration_seconds,
      synced: r.synced,
      created_at: r.created_at,
      equipment_name: equipment?.name ?? '—',
      reason_label: reason?.label ?? null,
    };
  });
}

export async function updateEvent(
  id: string,
  patch: {
    equipment_id?: string;
    reason_id?: string | null;
    note?: string | null;
    started_at?: string;
    ended_at?: string | null;
    duration_seconds?: number | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('downtime_events')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('downtime_events').delete().eq('id', id);
  if (error) throw error;
}
