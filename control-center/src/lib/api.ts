import { supabase } from './supabaseClient';
import type { Tables, TablesUpdate } from '../types/database.types';

// ---------------------------------------------------------------------------
// Derived types from database.types.ts
// ---------------------------------------------------------------------------

export type Line = Tables<'lines'>;
export type Equipment = Tables<'equipment'>;
export type DowntimeReason = Tables<'downtime_reasons'>;
export type AppConfig = Tables<'app_config'>;
export type DowntimeEvent = Tables<'downtime_events'>;
export type UserRole = Tables<'user_roles'>;
export type GlobalNotificationEmail = Tables<'global_notification_emails'>;

/** A downtime event joined with its equipment + reason labels, for display. */
export interface DowntimeEventRow extends DowntimeEvent {
  equipment_name: string;
  reason_label: string | null;
  deleted_at: string | null;
  updated_at: string;
}

export interface Shift {
  id: string;
  line_id: string;
  name: string;
  start_hour: number;
  end_hour: number;
  display_order: number;
}

export interface OpenEvent {
  id: string;
  equipment_id: string;
  equipment_name: string;
  started_at: string;
}

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

export async function createLine(input: { name: string; short_name: string }): Promise<Line> {
  const { data, error } = await supabase.from('lines').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateLine(
  id: string,
  patch: Partial<Pick<Line, 'name' | 'short_name'>>,
): Promise<void> {
  const { error } = await supabase.from('lines').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteLine(id: string): Promise<void> {
  const { error } = await supabase.from('lines').delete().eq('id', id);
  if (error) throw error;
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
  values: {
    alert_threshold_minutes: number;
    alert_repeat_minutes: number;
    notify_enabled: boolean;
    notify_threshold_minutes: number;
    notify_emails: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('line_id', lineId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Notification recipients (global)
// ---------------------------------------------------------------------------

export async function getGlobalEmails(): Promise<GlobalNotificationEmail[]> {
  const { data, error } = await supabase
    .from('global_notification_emails')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function addGlobalEmail(email: string): Promise<void> {
  const { error } = await supabase.from('global_notification_emails').insert({ email });
  if (error) throw error;
}

export async function deleteGlobalEmail(id: string): Promise<void> {
  const { error } = await supabase.from('global_notification_emails').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Downtime events
// ---------------------------------------------------------------------------

export interface EventFilters {
  lineId: string;
  startDate?: string;
  endDate?: string;
  equipmentId?: string;
  reasonId?: string;
}

export const DEFAULT_PAGE_SIZE = 50;

export interface PaginatedEvents {
  rows: DowntimeEventRow[];
  totalCount: number;
}

function mapEventRows(data: Record<string, unknown>[]): DowntimeEventRow[] {
  return data.map((r): DowntimeEventRow => {
    const eq = r.equipment as { name: string } | { name: string }[] | null;
    const reason = r.downtime_reasons as { label: string } | { label: string }[] | null;
    const equipment = Array.isArray(eq) ? eq[0] : eq;
    const reasonObj = Array.isArray(reason) ? reason[0] : reason;
    return {
      id: r.id as string,
      line_id: r.line_id as string,
      equipment_id: r.equipment_id as string,
      reason_id: r.reason_id as string | null,
      note: r.note as string | null,
      started_at: r.started_at as string,
      ended_at: r.ended_at as string | null,
      duration_seconds: r.duration_seconds as number | null,
      synced: r.synced as boolean,
      created_at: r.created_at as string,
      deleted_at: r.deleted_at as string | null,
      updated_at: r.updated_at as string,
      equipment_name: equipment?.name ?? '—',
      reason_label: reasonObj?.label ?? null,
    };
  });
}

const EVENT_SELECT =
  'id, line_id, equipment_id, reason_id, note, started_at, ended_at, ' +
  'duration_seconds, synced, created_at, deleted_at, updated_at, ' +
  'equipment ( name ), downtime_reasons ( label )';

function applyEventFilters(
  query: ReturnType<ReturnType<typeof supabase.from>['select']>,
  filters: EventFilters,
) {
  if (filters.startDate) query = query.gte('started_at', filters.startDate);
  if (filters.endDate) query = query.lte('started_at', filters.endDate);
  if (filters.equipmentId) query = query.eq('equipment_id', filters.equipmentId);
  if (filters.reasonId) query = query.eq('reason_id', filters.reasonId);
  return query;
}

export async function getEvents(
  filters: EventFilters,
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedEvents> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('downtime_events')
    .select(EVENT_SELECT, { count: 'exact' })
    .eq('line_id', filters.lineId)
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .range(from, to);

  query = applyEventFilters(query, filters);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: mapEventRows((data ?? []) as unknown as Record<string, unknown>[]),
    totalCount: count ?? 0,
  };
}

const EXPORT_CHUNK_SIZE = 1000;

/**
 * Fetch ALL events matching filters (no pagination). Used for CSV export.
 * Fetched in bounded chunks via `.range()` rather than one unbounded
 * request, so a large date range doesn't materialize a single huge
 * Supabase response in memory.
 */
export async function getAllEvents(filters: EventFilters): Promise<DowntimeEventRow[]> {
  const rows: DowntimeEventRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + EXPORT_CHUNK_SIZE - 1;
    let query = supabase
      .from('downtime_events')
      .select(EVENT_SELECT)
      .eq('line_id', filters.lineId)
      .is('deleted_at', null)
      .order('started_at', { ascending: false })
      .range(from, to);

    query = applyEventFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;

    const chunk = mapEventRows((data ?? []) as unknown as Record<string, unknown>[]);
    rows.push(...chunk);

    if (chunk.length < EXPORT_CHUNK_SIZE) break;
    from += EXPORT_CHUNK_SIZE;
  }

  return rows;
}

/** Update event — duration_seconds is omitted because the server trigger computes it.
 *  Pass expectedUpdatedAt for optimistic concurrency control. */
export async function updateEvent(
  id: string,
  patch: Omit<TablesUpdate<'downtime_events'>, 'duration_seconds'>,
  expectedUpdatedAt?: string,
): Promise<void> {
  let query = supabase
    .from('downtime_events')
    .update(patch)
    .eq('id', id);
  if (expectedUpdatedAt) {
    query = query.eq('updated_at', expectedUpdatedAt);
  }
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (expectedUpdatedAt && (!data || data.length === 0)) {
    throw new Error('This event was modified by another user. Please close and reopen to see the latest version.');
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('downtime_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// User roles
// ---------------------------------------------------------------------------

export async function getUserRole(_userId: string): Promise<'admin' | 'viewer'> {
  const { data, error } = await supabase.rpc('get_my_role');
  if (error) throw error;
  return (data as 'admin' | 'viewer') ?? 'viewer';
}

// ---------------------------------------------------------------------------
// Report RPC functions
// ---------------------------------------------------------------------------

export interface ReportByEquipment {
  equipment_id: string;
  equipment_name: string;
  total_seconds: number;
  event_count: number;
}

export interface ReportByReason {
  reason_id: string;
  reason_label: string;
  total_seconds: number;
  event_count: number;
}

export interface ReportByDay {
  day: string;
  total_seconds: number;
  event_count: number;
}

export interface ReportSummary {
  total_seconds: number;
  event_count: number;
}

export async function getReportByEquipment(
  lineId: string,
  start: string,
  end: string,
): Promise<ReportByEquipment[]> {
  const { data, error } = await supabase.rpc('downtime_by_equipment', {
    p_line_id: lineId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return (data ?? []) as ReportByEquipment[];
}

export async function getReportByReason(
  lineId: string,
  start: string,
  end: string,
): Promise<ReportByReason[]> {
  const { data, error } = await supabase.rpc('downtime_by_reason', {
    p_line_id: lineId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return (data ?? []) as ReportByReason[];
}

export async function getReportByDay(
  lineId: string,
  start: string,
  end: string,
  timezone: string,
): Promise<ReportByDay[]> {
  const { data, error } = await supabase.rpc('downtime_by_day', {
    p_line_id: lineId,
    p_start: start,
    p_end: end,
    p_timezone: timezone,
  });
  if (error) throw error;
  return (data ?? []) as ReportByDay[];
}

export async function getReportSummary(
  lineId: string,
  start: string,
  end: string,
): Promise<ReportSummary> {
  const { data, error } = await supabase.rpc('downtime_summary', {
    p_line_id: lineId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  const arr = (data ?? []) as ReportSummary[];
  return arr[0] ?? { total_seconds: 0, event_count: 0 };
}

export interface LineAvailability {
  planned_seconds: number;
  downtime_seconds: number;
  availability_pct: number | null;
}

/** Availability OEE (Run Time / Planned Production Time) for a date range. */
export async function getLineAvailability(
  lineId: string,
  start: string,
  end: string,
): Promise<LineAvailability> {
  const { data, error } = await supabase.rpc('line_availability', {
    p_line_id: lineId,
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  const arr = (data ?? []) as LineAvailability[];
  return arr[0] ?? { planned_seconds: 0, downtime_seconds: 0, availability_pct: null };
}

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------

export async function getShifts(lineId: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('line_id', lineId)
    .order('display_order');
  if (error) throw error;
  return data ?? [];
}

export async function createShift(input: {
  line_id: string;
  name: string;
  start_hour: number;
  end_hour: number;
  display_order: number;
}): Promise<void> {
  const { error } = await supabase.from('shifts').insert(input);
  if (error) throw error;
}

export async function updateShift(
  id: string,
  patch: Partial<Pick<Shift, 'name' | 'start_hour' | 'end_hour' | 'display_order'>>,
): Promise<void> {
  const { error } = await supabase.from('shifts').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Open events (currently down)
// ---------------------------------------------------------------------------

export async function getOpenEvents(lineId: string): Promise<OpenEvent[]> {
  const { data, error } = await supabase.rpc('open_events', { p_line_id: lineId });
  if (error) throw error;
  return (data ?? []) as OpenEvent[];
}

// ---------------------------------------------------------------------------
// User management (via edge function)
// ---------------------------------------------------------------------------

export interface ManagedUser {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  created_at: string;
  last_sign_in_at: string | null;
}

async function callManageUsers(method: string, body?: Record<string, unknown>, params?: Record<string, string>): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  let url = `${supabaseUrl}/functions/v1/manage-users`;
  if (params) {
    url += '?' + new URLSearchParams(params).toString();
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export async function listUsers(): Promise<ManagedUser[]> {
  return (await callManageUsers('GET')) as ManagedUser[];
}

export async function createUser(email: string, password: string, role: 'admin' | 'viewer'): Promise<void> {
  await callManageUsers('POST', { email, password, role });
}

export async function updateUser(userId: string, patch: { role?: string; password?: string }): Promise<void> {
  await callManageUsers('PUT', { user_id: userId, ...patch });
}

export async function deleteUser(userId: string): Promise<void> {
  await callManageUsers('DELETE', undefined, { user_id: userId });
}
