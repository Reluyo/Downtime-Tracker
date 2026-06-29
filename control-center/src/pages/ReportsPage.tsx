import { useCallback, useEffect, useState } from 'react';
import { useLine } from '../lib/LineContext';
import {
  getAllEvents,
  getReportByDay,
  getReportByEquipment,
  getReportByReason,
  getReportSummary,
} from '../lib/api';
import type {
  ReportByDay,
  ReportByEquipment,
  ReportByReason,
  ReportSummary,
} from '../lib/api';
import {
  browserTimezone,
  downloadCsv,
  endOfDayIso,
  formatDuration,
  startOfDayIso,
} from '../lib/format';
import styles from './Reports.module.css';

export default function ReportsPage() {
  const { line } = useLine();

  // Default to the last 30 days.
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 29 * 24 * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(iso(monthAgo));
  const [endDate, setEndDate] = useState(iso(today));
  const [byEquipment, setByEquipment] = useState<ReportByEquipment[]>([]);
  const [byReason, setByReason] = useState<ReportByReason[]>([]);
  const [byDay, setByDay] = useState<ReportByDay[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({ total_seconds: 0, event_count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!line) return;
    setLoading(true);
    setError(null);
    try {
      const start = startDate ? startOfDayIso(startDate) : startOfDayIso(iso(monthAgo));
      const end = endDate ? endOfDayIso(endDate) : endOfDayIso(iso(today));
      const tz = browserTimezone();

      const [eqData, reasonData, dayData, summaryData] = await Promise.all([
        getReportByEquipment(line.id, start, end),
        getReportByReason(line.id, start, end),
        getReportByDay(line.id, start, end, tz),
        getReportSummary(line.id, start, end),
      ]);

      setByEquipment(eqData);
      setByReason(reasonData);
      setByDay(dayData);
      setSummary(summaryData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function exportAll() {
    if (!line) return;
    setExporting(true);
    try {
      const start = startDate ? startOfDayIso(startDate) : undefined;
      const end = endDate ? endOfDayIso(endDate) : undefined;
      const events = await getAllEvents({ lineId: line.id, startDate: start, endDate: end });
      const headers = ['Line', 'Equipment', 'Reason', 'Note', 'Started', 'Ended', 'Duration (s)'];
      const rows = events.map((e) => [
        line.short_name,
        e.equipment_name,
        e.reason_label ?? '',
        e.note ?? '',
        e.started_at,
        e.ended_at ?? '',
        String(e.duration_seconds ?? ''),
      ]);
      downloadCsv(`downtime-${startDate}-to-${endDate}.csv`, headers, rows);
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setExporting(false);
    }
  }

  if (!line) return <p>Loading line...</p>;

  return (
    <section>
      <h2>Reports --- {line.short_name}</h2>

      <div className="filters">
        <label>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button
          className="btn-secondary"
          onClick={exportAll}
          disabled={exporting || summary.event_count === 0}
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p className="summary">
            <strong>{summary.event_count}</strong> closed events ·{' '}
            <strong>{formatDuration(summary.total_seconds)}</strong> total downtime
          </p>

          <div className={styles.reportGrid}>
            <ReportTable
              title="By Equipment"
              showBars
              lineName={line.short_name}
              rows={byEquipment.map((b) => ({
                key: b.equipment_id,
                label: b.equipment_name,
                count: b.event_count,
                totalSeconds: b.total_seconds,
              }))}
            />
            <ReportTable
              title="By Reason Code"
              showBars
              lineName={line.short_name}
              rows={byReason.map((b) => ({
                key: b.reason_id,
                label: b.reason_label || '(no reason)',
                count: b.event_count,
                totalSeconds: b.total_seconds,
              }))}
            />
            <ReportTable
              title="By Day"
              lineName={line.short_name}
              rows={byDay.map((b) => ({
                key: b.day,
                label: b.day,
                count: b.event_count,
                totalSeconds: b.total_seconds,
              }))}
            />
          </div>
        </>
      )}
    </section>
  );
}

interface TableRow {
  key: string;
  label: string;
  count: number;
  totalSeconds: number;
}

function ReportTable({ title, rows, showBars, lineName }: { title: string; rows: TableRow[]; showBars?: boolean; lineName: string }) {
  const columnName = title.replace('By ', '');

  function exportTable() {
    const headers = ['Line', columnName, 'Events', 'Downtime (s)', 'Downtime'];
    const csvRows = rows.map((b) => [
      lineName,
      b.label,
      String(b.count),
      String(b.totalSeconds),
      formatDuration(b.totalSeconds),
    ]);
    downloadCsv(`downtime-${columnName.toLowerCase().replace(/\s+/g, '-')}.csv`, headers, csvRows);
  }

  return (
    <div className={styles.reportCard}>
      <div className={styles.reportCardHeader}>
        <h3>{title}</h3>
        <button className="btn-link-dark" onClick={exportTable} disabled={rows.length === 0}>
          CSV
        </button>
      </div>
      <table className="data-table compact">
        <thead>
          <tr>
            <th>{columnName}</th>
            <th style={{ width: 70 }}>Events</th>
            <th style={{ width: 120 }}>Downtime</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="empty">
                No data
              </td>
            </tr>
          )}
          {rows.map((b) => {
            const maxSeconds = Math.max(...rows.map((r) => r.totalSeconds), 1);
            const pct = (b.totalSeconds / maxSeconds) * 100;
            return (
              <tr key={b.key}>
                <td>{b.label}</td>
                <td>{b.count}</td>
                <td>
                  {formatDuration(b.totalSeconds)}
                  {showBars && (
                    <div
                      className={styles.bar}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
