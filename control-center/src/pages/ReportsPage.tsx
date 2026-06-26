import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLine } from '../lib/LineContext';
import { getEvents } from '../lib/api';
import type { DowntimeEventRow } from '../types';
import { endOfDayIso, formatDuration, localDateKey, startOfDayIso } from '../lib/format';

interface Bucket {
  key: string;
  label: string;
  totalSeconds: number;
  count: number;
}

function aggregate(
  events: DowntimeEventRow[],
  keyFn: (e: DowntimeEventRow) => { key: string; label: string },
): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const e of events) {
    const { key, label } = keyFn(e);
    const existing = map.get(key) ?? { key, label, totalSeconds: 0, count: 0 };
    existing.totalSeconds += e.duration_seconds ?? 0;
    existing.count += 1;
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.totalSeconds - a.totalSeconds);
}

export default function ReportsPage() {
  const { line } = useLine();

  // Default to the last 30 days.
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 29 * 24 * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(iso(monthAgo));
  const [endDate, setEndDate] = useState(iso(today));
  const [events, setEvents] = useState<DowntimeEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!line) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getEvents({
        lineId: line.id,
        startDate: startDate ? startOfDayIso(startDate) : undefined,
        endDate: endDate ? endOfDayIso(endDate) : undefined,
      });
      // Only closed events contribute to downtime totals.
      setEvents(rows.filter((r) => r.duration_seconds != null));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [line, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const byEquipment = useMemo(
    () => aggregate(events, (e) => ({ key: e.equipment_id, label: e.equipment_name })),
    [events],
  );
  const byReason = useMemo(
    () =>
      aggregate(events, (e) => ({
        key: e.reason_id ?? 'none',
        label: e.reason_label ?? '(no reason)',
      })),
    [events],
  );
  const byDay = useMemo(
    () =>
      aggregate(events, (e) => {
        const day = localDateKey(e.started_at);
        return { key: day, label: day };
      }).sort((a, b) => a.label.localeCompare(b.label)),
    [events],
  );

  const grandTotal = events.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  if (!line) return <p>Loading line…</p>;

  return (
    <section>
      <h2>Reports — {line.short_name}</h2>

      <div className="filters">
        <label>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <p className="summary">
            <strong>{events.length}</strong> closed events ·{' '}
            <strong>{formatDuration(grandTotal)}</strong> total downtime
          </p>

          <div className="report-grid">
            <ReportTable title="By Equipment" buckets={byEquipment} />
            <ReportTable title="By Reason Code" buckets={byReason} />
            <ReportTable title="By Day" buckets={byDay} />
          </div>
        </>
      )}
    </section>
  );
}

function ReportTable({ title, buckets }: { title: string; buckets: Bucket[] }) {
  return (
    <div className="report-card">
      <h3>{title}</h3>
      <table className="data-table compact">
        <thead>
          <tr>
            <th>{title.replace('By ', '')}</th>
            <th style={{ width: 70 }}>Events</th>
            <th style={{ width: 120 }}>Downtime</th>
          </tr>
        </thead>
        <tbody>
          {buckets.length === 0 && (
            <tr>
              <td colSpan={3} className="empty">
                No data
              </td>
            </tr>
          )}
          {buckets.map((b) => (
            <tr key={b.key}>
              <td>{b.label}</td>
              <td>{b.count}</td>
              <td>{formatDuration(b.totalSeconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
