// Shared types mirroring the Supabase schema (see supabase/migrations).

export interface Line {
  id: string;
  name: string;
  short_name: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  line_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DowntimeReason {
  id: string;
  equipment_id: string;
  label: string;
  requires_note: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DowntimeEvent {
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
}

/** A downtime event joined with its equipment + reason labels, for display. */
export interface DowntimeEventRow extends DowntimeEvent {
  equipment_name: string;
  reason_label: string | null;
}

export interface AppConfig {
  id: string;
  line_id: string;
  alert_threshold_minutes: number;
  alert_repeat_minutes: number;
  updated_at: string;
}
