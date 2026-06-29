import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { useRole } from '../lib/RoleContext';
import { supabase } from '../lib/supabaseClient';
import {
  deleteEvent,
  getEquipment,
  getEvents,
  getReasons,
  updateEvent,
  DEFAULT_PAGE_SIZE,
} from '../lib/api';
import type { DowntimeEventRow, DowntimeReason, Equipment } from '../lib/api';
import {
  endOfDayIso,
  formatDateTime,
  formatDuration,
  startOfDayIso,
} from '../lib/format';
import styles from './History.module.css';

function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function localInputToIso(val: string): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}

export default function HistoryPage() {
  const { line } = useLine();
  const { isAdmin } = useRole();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [events, setEvents] = useState<DowntimeEventRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [filterReasons, setFilterReasons] = useState<DowntimeReason[]>([]);

  const [editing, setEditing] = useState<DowntimeEventRow | null>(null);

  useEffect(() => {
    if (!line) return;
    getEquipment(line.id).then(setEquipment).catch((e) => setError(e.message));
  }, [line]);

  // Reason options follow the selected equipment filter.
  useEffect(() => {
    setReasonId('');
    if (!equipmentId) {
      setFilterReasons([]);
      return;
    }
    getReasons(equipmentId).then(setFilterReasons).catch(() => setFilterReasons([]));
  }, [equipmentId]);

  const load = useCallback(async () => {
    if (!line) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getEvents(
        {
          lineId: line.id,
          startDate: startDate ? startOfDayIso(startDate) : undefined,
          endDate: endDate ? endOfDayIso(endDate) : undefined,
          equipmentId: equipmentId || undefined,
          reasonId: reasonId || undefined,
        },
        page,
        DEFAULT_PAGE_SIZE,
      );
      setEvents(result.rows);
      setTotalCount(result.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [line, startDate, endDate, equipmentId, reasonId, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [startDate, endDate, equipmentId, reasonId]);

  // Real-time subscription (Fix #10)
  useEffect(() => {
    if (!line) return;
    const channel = supabase
      .channel('downtime-events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'downtime_events',
          filter: `line_id=eq.${line.id}`,
        },
        () => {
          // Refresh the list on any change
          load();
        },
      )
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [line, load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));

  const equipmentById = useMemo(
    () => new Map(equipment.map((e) => [e.id, e.name])),
    [equipment],
  );

  async function handleDelete(row: DowntimeEventRow) {
    if (!confirm(`Delete this ${row.equipment_name} event? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteEvent(row.id);
      setEvents((prev) => prev.filter((e) => e.id !== row.id));
      setTotalCount((c) => c - 1);
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!line) return <p>Loading line...</p>;

  return (
    <section>
      <div className={styles.titleRow}>
        <h2>Downtime History</h2>
        {liveConnected && (
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Live
          </span>
        )}
      </div>

      <div className="filters">
        <label>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label>
          Equipment
          <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            <option value="">All</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reason
          <select
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            disabled={!equipmentId}
          >
            <option value="">All</option>
            {filterReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary"
          onClick={() => {
            setStartDate('');
            setEndDate('');
            setEquipmentId('');
            setReasonId('');
          }}
        >
          Clear
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Equipment</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Note</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="empty">
                    No events match these filters.
                  </td>
                </tr>
              )}
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateTime(e.started_at)}</td>
                  <td>{e.equipment_name}</td>
                  <td>{formatDuration(e.duration_seconds)}</td>
                  <td>{e.reason_label ?? '---'}</td>
                  <td className="note-cell">{e.note ?? ''}</td>
                  <td>
                    <span className={e.ended_at ? 'badge closed' : 'badge open'}>
                      <span className="dot" />
                      {e.ended_at ? 'Closed' : 'Open'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="actions">
                      <button className="btn-link-dark" onClick={() => setEditing(e)}>
                        Edit
                      </button>
                      <button className="btn-link-danger" onClick={() => handleDelete(e)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {totalCount > DEFAULT_PAGE_SIZE && (
            <div className={styles.pagination}>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {editing && (
        <EditEventModal
          event={editing}
          equipment={equipment}
          equipmentById={equipmentById}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}

function EditEventModal({
  event,
  equipment,
  onClose,
  onSaved,
}: {
  event: DowntimeEventRow;
  equipment: Equipment[];
  equipmentById: Map<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [equipmentId, setEquipmentId] = useState(event.equipment_id);
  const [reasons, setReasons] = useState<DowntimeReason[]>([]);
  const [reasonId, setReasonId] = useState(event.reason_id ?? '');
  const [note, setNote] = useState(event.note ?? '');
  const [startedAt, setStartedAt] = useState(isoToLocalInput(event.started_at));
  const [endedAt, setEndedAt] = useState(isoToLocalInput(event.ended_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReasons(equipmentId).then(setReasons).catch(() => setReasons([]));
  }, [equipmentId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const startedIso = localInputToIso(startedAt);
      const endedIso = localInputToIso(endedAt);
      // Fix #2: Don't send duration_seconds — the server trigger computes it.
      await updateEvent(event.id, {
        equipment_id: equipmentId,
        reason_id: reasonId || null,
        note: note.trim() ? note.trim() : null,
        started_at: startedIso ?? event.started_at,
        ended_at: endedIso,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit event</h3>
        {error && <div className="error">{error}</div>}

        <label>
          Equipment
          <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Reason
          <select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
            <option value="">--- none ---</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Note
          <textarea value={note} maxLength={240} rows={2} onChange={(e) => setNote(e.target.value)} />
        </label>

        <label>
          Started
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        </label>

        <label>
          Ended
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
